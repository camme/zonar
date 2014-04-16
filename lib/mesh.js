var ipAddresses = require('./ipaddresses');
var merge = require('merge');
var dgram = require('dgram');
var slug = require('slug');
var Netmask = require('netmask').Netmask;
var events = require('events');

var defaultOptions = {
    id: "",
    port: 5777,
    broadcastAddress: null,
    scanPort: 5666,
    autoScan: true,
    broadcastIdentifier: "HIT",
    payload: "",
    pulseTimer: 1000 * 60 * 5
};

function Hitta(options) {

    var listenSocket = null;
    var socket = null;
    var status = "inactive";
    var self = this;

    events.EventEmitter.call(this);

    // Merge default and custom options
    options = merge(defaultOptions, options);

    var nodeList = {}
    var broadcastIdentifier = options.broadcastIdentifier;
    var port = options.port;
    var id = options.id;
    var scanPort = options.scanPort;
    var address = ipAddresses.get()[0];
    var broadcastAddress = options.broadcastAddress;
    var payload = options.payload;
    var pulseTimer = options.pulseTimer;
    var keepAliveTimer = pulseTimer * 1.1;
    var pulseIntervalRef = -1;

    if (!broadcastAddress) {
        var block = new Netmask(address + "/24");
        broadcastAddress = block.broadcast;
    }

    // Begin transmitting
    function start() {
        if (status == "inactive") {
            status = "starting";
            listen(function(err) {
                broadcast(function() {
                    status = "broadcasting";
                });
            });
        }
    }

    function stop(next) {

        var message = createPayload("QUIT");
        send(message, scanPort, broadcastAddress, function() {


            clearInterval(pulseIntervalRef);

            listenSocket.close();
            socket.close();
            status = "inactive";

            if (typeof next == "function") {
                next();
            }

        });

    }

    // Listen for incoming single messages
    function listen(next) {

        listenSocket = dgram.createSocket('udp4');

        listenSocket.on('message', function(payload, rinfo) {
            var message = parsePayload(payload, rinfo);
            if (message) {
                if (message.id != id || message.port != port || rinfo.address != address) {
                    if (message.status == "ONE") {
                        updateNodeList(message);
                    }
                }
            }
        });

        listenSocket.bind(function() {
            var info = listenSocket.address();
            listenPort = info.port;
            next();
        });

    }

    // Send my info to listeners
    function sendMyInfo(senderMessage, senderInfo) {

        var message = createPayload("ONE");
        var socket = dgram.createSocket('udp4');

        socket.bind(function() {
            socket.send(message, 0, message.length, senderMessage.listenPort, senderInfo.address, function(err, bytes) {
                socket.close();
            });
        });

    }

    function updateNodeList(message) {

        var nodeKey = getNodeKey(message);

        if (message.status == "QUIT") {

            self.emit('dropped', message);
            delete nodeList[nodeKey];

        } else {

            if (!nodeList[nodeKey]) {

                delete message.status;
                nodeList[nodeKey] = message;

                var newArrayList = [];
                for(var key in nodeList) {
                    newArrayList.push({
                        key: key,
                        node: nodeList[key]
                    });
                }

                newArrayList.sort(function(a, b){
                    if (a.key < b.key) return -1;
                    if (a.key > b.key) return 1;
                    return 0;
                });

                var list = {};
                newArrayList.forEach(function(item) {
                    var key = item.key;
                    delete item.key;
                    var node = item.node;
                    list[key] = item.node;
                });

                self.emit('found', message);

                nodeList = list;

            }

            nodeList[nodeKey].timestamp = (new Date()).getTime();

        }

    }


    function getNodeKey(nodeInfo) {
        var nodeKey = nodeInfo.id + "-" + nodeInfo.address + ":" + nodeInfo.port;
        return nodeKey;
    }


    function send(message, port, address, next) {
        socket.send(message, 0, message.length, port, address, function(err, bytes) {
            if (typeof next == "function") {
                next();
            }
            //console.log("%s sent '%s' = %s bytes to %s:%s", id, message, bytes, address, port);
        });
    }



    function broadcast() {


        //time = (new Date()).getTime();
        var message = createPayload("NEW");

        socket = dgram.createSocket('udp4');

        socket.on('message', function(payload, rinfo) {

            var message = parsePayload(payload, rinfo);

            if (message) {

                if (message.id != id || message.port != port || rinfo.address != address) {
                    if (message.status == "NEW") {
                        sendMyInfo(message, rinfo);
                    }
                    updateNodeList(message);
                }

            }

        });

        socket.bind(scanPort, function() {

            socket.setBroadcast(true);

            function pulse() {
                send(message, scanPort, broadcastAddress);
                message = createPayload("ALIVE");
                keepAliveCheck();
            }

            pulse();

            pulseIntervalRef = setInterval(pulse, pulseTimer);

        });


    }

    function getList() {
        return nodeList;
    }

    function keepAliveCheck() {

        var newList = {};

        for(var key in nodeList) {

            var node = nodeList[key];
            var timestamp = node.timestamp;
            var now = (new Date()).getTime();
            var delta = now - timestamp;
            if (delta < keepAliveTimer) {
                newList[key] = node;
            } else {
                self.emit('dropped', node);
            }

        }

        nodeList = newList;

    }

    function parsePayload(payload, senderInfo) {

        var messageString = payload.toString();
        var messageParts = messageString.split(" ");

        var messageObject = null;

        if (messageParts.length > 0 && messageParts[0] == broadcastIdentifier) {

            messageObject = {
                id: messageParts[1],
                port: messageParts[2],
                listenPort: messageParts[3],
                status: messageParts[4],
                payload: messageParts[5]
            };

            messageObject.address = senderInfo.address;

        }

        return messageObject;

    }

    // Creates the broadcast string, and returns a buffer
    function createPayload(status) {

        var message = [];

        message.push(broadcastIdentifier);
        message.push(slug(id).toLowerCase());
        message.push(port);
        message.push(listenPort);
        message.push(status);
        message.push(payload);

        var messageString = message.join(" ");

        return new Buffer(messageString);

    }

    // We just expose the start and getList methods, everything else is considered private
    this.start = start;
    this.stop = stop;
    this.getList = getList;

}

Hitta.prototype.__proto__ = events.EventEmitter.prototype;

exports.create = function(options) {
    return new Hitta(options);
}

