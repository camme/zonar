var ipAddresses = require('./ipaddresses');
var merge = require('merge');
var dgram = require('dgram');
var fs = require('fs');
var Netmask = require('netmask').Netmask;
var events = require('events');
var path = require('path');
var compabilityVersion = exports.compabilityVersion = "0.6";

var defaultOptions = {
    net: "zon", 
    broadcastAddress: null,
    scanPort: 5666,
    autoScan: true,
    broadcastIdentifier: "ZONAR",
    payload: "",
    pulseTimer: 1000 * 60 * 5,
    verbose: false,
    address: "0.0.0.0"
};

function Zonar(options) {

    var listenSocket = null;
    var socket = null;
    var status = "inactive";
    var self = this;
    var mode = "broadcast";

    events.EventEmitter.call(this);

    // Merge default and custom options
    options = merge(defaultOptions, options);

    var nodeList = {};
    var timestamp = new Date();
    var id = this.id = randomString(64);


    var broadcastIdentifier = options.broadcastIdentifier;
    var name = options.name ? options.name.replace(/[\s]/g, '-').toLowerCase() : null; //'random' + Math.random().toString().substring(1);
    var scanPort = options.scanPort;
    var netId = options.net;

    log("Create %s with id = %s", name, id);

    var addressList = ipAddresses.get();
    var address = options.address;
    var broadcastAddress = options.broadcastAddress;
    var payload = typeof options.payload == "object" ? JSON.stringify(options.payload) : options.payload;
    var payloadLength = (new Buffer(payload)).length;
    var pulseTimer = options.pulseTimer;
    var keepAliveTimer = pulseTimer * 1.1;
    var pulseIntervalRef = -1;

    if (!broadcastAddress) {
        var block = new Netmask(addressList[0] + "/24");
        broadcastAddress = block.broadcast;
    }

    // Expose the payload property as a getter/setter so we can keep our normal "private"
    // payload variable as usual
    Object.defineProperty(this, "payload", {
        get: function() {
            return payload; 
        },
        set: function(p) { 
            payload = typeof p == "object" ? JSON.stringify(p) : p;
        }
    });

    // Expose the address as a read value, since we dont allow to change it afterwards
    Object.defineProperty(this, "address", {
        get: function() {
            return address; 
        }
    });


    function log() {
        if (options.verbose) {
            console.log.apply(this, arguments);
        }
    }

    // Begin transmitting
    function start(next) {

        if (!name) {
            throw new Error("Please provide a name for your service if you are using .start(). No spaces.");
        }

        mode = "broadcast";

        log("Starting %s[%s] in %s mode", name, id, mode);
        if (status == "inactive") {
            status = "starting";
            listen(function(err) {
                if (err) {
                    if (typeof next == "function") {
                        next(err);
                    }
                    return;
                }
                log("Listening socket for %s[%s] initiated with port %s", name, id, self.port);
                broadcast(function(err) {
                    status = "broadcasting";
                    log("Broadcast for %s[%s] initiated", name, id);
                    if (typeof next == "function") {
                        next(err);
                    }
                });
            });
        }
        else {
            if (typeof next == "function") {
                next();
            }
        }

    }

    function justListen(next) {
        mode = "listen";
        var randomAppend = randomString(32);
        name = name ? name + "-" + randomString : "random-" + randomAppend;
        if (status == "inactive") {
            status = "starting";
            listen(function(err) {
                broadcast(function() {
                    status = "broadcasting";
                    if (typeof next == "function") {
                        next();
                    }
                });
            });
        }
        else {
            if (typeof next == "function") {
                next();
            }
        }
    }


    function stop(next) {

        if (status != "inactive") {

            var message = createMessage("QUIT");

            // If we dont call next after half a second after sending, we call it anyway
            var stopTimeout = setTimeout(function() {
                if (typeof next == "function") {
                    next();
                }
            }, 500);

            send(message, scanPort, broadcastAddress, function() {

                clearInterval(pulseIntervalRef);

                listenSocket.close();
                socket.close();
                status = "inactive";

                // Since we will call next, we can clear the timeout
                clearTimeout(stopTimeout);

                if (typeof next == "function") {
                    process.nextTick(next);
                }

            });

        } else {
            if (typeof next == "function") {
                next();
            }
        }

    }

    // Listen for incoming single messages
    function listen(next) {

        listenSocket = dgram.createSocket('udp4');

        listenSocket.on('message', function(payload, rinfo) {
            var message = parseMessage(payload, rinfo);
            if (message) {
                if (message.id != id) {
                    if (message.status == "ONE") {
                        updateNodeList(message);
                    } else if (message.mode != 'listen' && message.status == "NAMETAKEN") {
                        stop(function() {
                            throw new Error('name already taken "' + name + '"');
                            //self.emit("error", {cause: "Name already taken"});
                        });
                    }
                } else {
                    //self.emit('error', id + " already exists in network");
                    throw new Error(id + ' already exits in network');
                    stop();
                }
            }
        });

        listenSocket.bind(function(err) {
            var info = listenSocket.address();
            self.port = info.port;
            next(err);
        });

    }

    // Send my info to listeners
    function sendMyInfo(senderMessage, senderInfo) {

        if (mode == "listen") {
            return;
        }

        var message = createMessage("ONE");
        var socket = dgram.createSocket('udp4');

        socket.bind(function() {
            socket.send(message, 0, message.length, senderMessage.port, senderInfo.address, function(err, bytes) {
                socket.close();
            });
        });

    }

    // Send my info to listeners
    function sendNameAlreadyTaken(senderMessage, senderInfo) {

        if (mode == "listen") {
            return;
        }

        var message = createMessage("NAMETAKEN");
        var socket = dgram.createSocket('udp4');

        socket.bind(function() {
            log("%s [%s] sent '%s' to %s:%s", name, id, message, senderInfo.address, senderInfo.port);
            socket.send(message, 0, message.length, senderMessage.port, senderInfo.address, function(err, bytes) {
                socket.close();
            });
        });

    }


    function updateNodeList(message) {

        var nodeKey = getNodeKey(message);

        if (message.status == "QUIT") {

            if (nodeList[nodeKey]) {
                delete nodeList[nodeKey];
                self.emit('dropped', message);
                self.emit('dropped.' + message.name, message);
            }

        } else {

            log("%s < %s", name, message.name);
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

                nodeList = list;
                var c = 0;
                for(k in nodeList) {
                    c++;
                }

                self.emit('found', message);
                self.emit('found.' + message.name, message);

            }

            nodeList[nodeKey].timestamp = (new Date()).getTime();

        }

    }


    function getNodeKey(nodeInfo) {
        //var nodeKey = nodeInfo.id + "-" + nodeInfo.address + ":" + nodeInfo.port;
        return nodeInfo.name;
    }


    function send(message, port, address, next) {
        socket.send(message, 0, message.length, port, address, function(err, bytes) {
            if (typeof next == "function") {
                next();
            }
            log("%s [%s] sent '%s' to %s:%s", name, id, message, address, port);
        });
    }


    function broadcast(next) {


        //time = (new Date()).getTime();
        var action = mode == "broadcast" ? "NEW" : "NEWL";
        var message = createMessage(action);

        socket = dgram.createSocket('udp4');

        socket.on('message', function(payload, rinfo) {

            var message = parseMessage(payload, rinfo);

            if (message) {

                if (message.id != id) {

                    log("%s [%s] got '%s' from %s:%s", name, id, payload.toString(), rinfo.address, rinfo.port);
                    if (message.name != name) {

                        var updateList = true;
                        if (message.status == "NEW") {
                            sendMyInfo(message, rinfo);
                        } else if (message.status == "NEWL") {
                            sendMyInfo(message, rinfo);
                            updateList = false;
                        }
                        if (updateList) {
                            updateNodeList(message);
                        }

                    } else if (message.mode != "listen") {
                        sendNameAlreadyTaken(message, rinfo);
                    }

                }
            }

        });

        socket.bind(scanPort, this.address, function() {

            socket.setBroadcast(true);

            function pulse() {
                send(message, scanPort, broadcastAddress);
                message = createMessage("ALIVE");
                keepAliveCheck();
            }

            pulse();

            if (mode == "broadcast") {
                pulseIntervalRef = setInterval(pulse, pulseTimer);
            } else {
                pulseIntervalRef = setInterval(keepAliveCheck, pulseTimer);
            }

            if (typeof next == "function") {
                next();
            }


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
                self.emit('lost', node);
            }

        }

        self.emit('heartbeat');

        nodeList = newList;

    }

    function parseMessage(payload, senderInfo) {

        var messageString = payload.toString();

        var messageParts = messageString.split(" ");

        var messageObject = null;

        var messageIdentifier = messageParts.shift();
        var version = messageParts.shift(); 
        var broadcastNet = messageParts.shift(); 

        if (messageParts.length > 0 && messageIdentifier == broadcastIdentifier && version == compabilityVersion && broadcastNet == netId) {

            messageObject = {
                net: broadcastNet,
                id: messageParts.shift(),
                name: messageParts.shift(),
                port: messageParts.shift(),
                status: messageParts.shift(),
                mode: messageParts.shift(),
            };

            // pick out the last strings as pairs of length:message
            var customMessagesString = messageParts.join(" ");
            var cursor = 0;
            var customMessages = [];

            while (customMessagesString.length != 0) {

                var indexOfSeparator = customMessagesString.indexOf(":");
                var length = parseInt(customMessagesString.substring(cursor, indexOfSeparator));

                if (length == 0) {
                    break;
                }

                customMessagesString = customMessagesString.substring(indexOfSeparator + 1);
                var messageString = customMessagesString.substring(0, length);
                customMessagesString = customMessagesString.substring(messageString.length);
                customMessages.push(messageString);
            }

            messageObject.payload = customMessages[0];

            try {
                messageObject.payload = JSON.parse(customMessages[0]);
            } catch(err) {
                // just dont care if its not json, we just read it as a string in that case
            }

            messageObject.address = senderInfo.address;

        }

        return messageObject;

    }

    // Creates the broadcast string, and returns a buffer
    function createMessage(status) {

        var message = [];

        message.push(broadcastIdentifier);
        message.push(compabilityVersion);
        message.push(netId);
        message.push(id);
        message.push(name);
        message.push(self.port);
        message.push(status);
        message.push(mode);
        payloadLength = payload.length;
        message.push(payloadLength + ':' + payload);

        var messageString = message.join(" ");

        return new Buffer(messageString);

    }

    function checkOptions(newOpions) {
   }

    // randomString returns a pseude-random ASCII string which contains at least the specified number of bits of entropy
    // the return value is a string of length ⌈bits/6⌉ of characters from the base64 alphabet
    function randomString(bits) {

        var chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        var ret = '';

        // in v8, Math.random() yields 32 pseudo-random bits (in spidermonkey it gives 53)
        while(bits > 0) {
            var rand = Math.floor(Math.random()*0x100000000); // 32-bit integer

            // base 64 means 6 bits per character, so we use the top 30 bits from rand to give 30/6=5 characters.
            for(var i=26; i>0 && bits>0; i-=6, bits-=6) ret+=chars[0x3F & rand >>> i];
        }
        return ret;
    }

    // We just expose the start and getList methods, everything else is considered private
    this.start = start;
    this.stop = stop;
    this.listen = justListen;
    this.getList = getList;

    // Only for testing purposes, dont use directly
    this._private = {
        createMessage: createMessage,
        parseMessage: parseMessage
    };


}

Zonar.prototype.__proto__ = events.EventEmitter.prototype;

exports.create = function(options) {
    return new Zonar(options);
}

