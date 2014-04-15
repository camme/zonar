var scanner = require('./scanner');
var ipAddresses = require('./ipaddresses');
var merge = require('merge');
var zmq = require('zmq');
var dgram = require('dgram');

var defaultOptions = {
    port: 5777,
    scanPort: 5776,
    autoScan: true
};

function init(options) {

    var addresses = ipAddresses.get();
    var sock = zmq.socket('pair');
    var node = zmq.socket('pair');

    var nodeList = [];

    // Merge default and custom options
    options = merge(defaultOptions, options);

    var myAddress = addresses[0] + ':' + options.port;

    sock.bindSync('tcp://*:' + options.port);

    console.log("");
    console.log("Started NODE '%s' at %s", options.name, myAddress);
    console.log("");

    sock.on('message', function(data) {
        var event = JSON.parse(data,toString());
        if (event._name == "get.node.list") {
            var tempSocket = zmq.socket('pair');
            tempSocket.connect("tcp://" + event.node);
            console.log("Got z-event from %s", event.node, event);
            tempSocket.send(JSON.stringify({message: "hi from " + options.name, name: options.name, addess: myAddress}));
        }
        console.log("");
    });

    var scanServer = dgram.createSocket('udp4');
    scanServer.on('message', function(message, rinfo) {

        var event = JSON.parse(message.toString());

        if (event._name == "zmesh.scan" && myAddress != event.origin) {


            console.log("Got scan from %s", event.origin);
            var event = { _name: 'zmesh.scan.response', name: options.name, address: myAddress };
            var message = new Buffer(JSON.stringify(event));
            //console.log("Responde to scan by sending %s", JSON.stringify(event));

            scanServer.send(message, 0, message.length, rinfo.port, rinfo.address, function(err, bytes) {
                if (err) {
                    console.log(err);
                }
            });

        }

    });

    scanServer.bind(options.scanPort);

    if (options.autoScan) {

        scanner.scan(addresses[0], options.scanPort, myAddress, function(nodeData) {
            console.log("FOUND ONE", nodeData);
            console.log("z-connect and ask for node list");
            node.connect("tcp://" + nodeData.address);
            node.on('connect', function() {
                console.log("connected");
                var event = JSON.stringify({_name: "get.node.list", node: myAddress});
                node.send(event);
            });
            var event = JSON.stringify({_name: "get.node.list", node: myAddress});
            node.send(event);
            console.log("");
        });

    }

    return {
        stop: function() {
            sock.close();
        }
    };

}

exports.init = init;

/*setInterval(function(){
  console.log('sending work');
  sock.send('some work');
  }, 500);\
  */


