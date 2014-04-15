var dgram = require('dgram');
var net = require('net');

var checkPort = function(port, host, origin, callback) {


    var socket = dgram.createSocket('udp4');
    var status = null;

    // Socket connection established, port is open
    socket.on('connect', function() {
        status = 'open';
    });

    //socket.setTimeout(1500);// If no response, assume port is not listening
    socket.on('timeout', function() {status = 'closed';socket.destroy();});
    socket.on('error', function(exception) {status = 'closed';});

    socket.on('close', function(exception) {
        //callback(null, status, host, port);
    });

    socket.on('message', function(message, rinfo) {
        var event = JSON.parse(message.toString());
        console.log("Scanner of %s recieved %s", origin, JSON.stringify(event));
        console.log("");
        if (event._name == "zmesh.scan.response") {
            status = "open";
            callback(null, event);
            socket.close();
        }
    });

    socket.bind(port, host);

    var event = { _name: 'zmesh.scan', origin: origin };
    var message = new Buffer(JSON.stringify(event));
    socket.send(message, 0, message.length, port, host, function(err, bytes) {
        if (!err) {
            //callback(null, status, host, port);
        }
    });


}

function scan(ip, port, origin, callback) {


    var ipStart = 0;
    var ipEnd = 0;
    var lan = '';
    var ipParts = ip.split(".");
    if (ipParts.length == 4) {
        ipStart = ipParts[3];
        ipEnd = ipParts[3];        
        lan = ipParts.slice(0, 3).join('.');
    }

    for(var i = ipStart; i <= ipEnd; i++){

        var ipNumber = lan + '.' + i;

        (function(ip, port, origin, callback) {
            checkPort(port, ip, origin, function(err, info) {
                if(info){
                    callback({ service: info.name, address: info.address});
                } else {
                    console.log("checked %s:%s", ip, port, err, info);
                }
            });
        })(ipNumber, port, origin, callback);

    }

}

exports.scan = scan;
