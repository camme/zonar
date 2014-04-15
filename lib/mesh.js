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

    // Merge default and custom options
    options = merge(defaultOptions, options);

    var myAddress = addresses[0] + ':' + options.port;

    sock.bindSync('tcp://*:' + options.port);

    console.log("Started NODE '%s' at %s", options.name, myAddress);

    sock.on('message', function(data) {
        var event = JSON.parse(data,toString());
        console.log("got event to %s", myAddress, event);
    });

    var scanServer = dgram.createSocket('udp4');
    scanServer.on('message', function(message, rinfo) {

        var event = JSON.parse(message.toString());
        console.log("");
        console.log("NODE %s [%s] recieved event: ", options.name, myAddress, event);

        if (event._name == "zmesh.scan" && myAddress != event.origin) {

            var event = { _name: 'zmesh.scan.response', name: options.name, address: myAddress };
            var message = new Buffer(JSON.stringify(event));
            console.log("Responde to scan by sending %s", JSON.stringify(event));
            console.log("");

            scanServer.send(message, 0, message.length, rinfo.port, rinfo.address, function(err, bytes) {
                if (err) {
                    console.log(err);
                }
            });

        } else {
            console.log("Ignore");
        }

    });

    scanServer.bind(options.scanPort);

    if (options.autoScan) {

        scanner.scan(addresses[0], options.scanPort, myAddress, function(nodeData) {
            console.log("FOUND ONE", nodeData);
            return;
            node.connect("tcp://" + nodeData.host + ":" + nodeData.port);
            node.on('connect', function() {
                console.log("connected");
            });
            var event = JSON.stringify({_name: "get.node.list", node: myAddress});
            node.send(event);
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


