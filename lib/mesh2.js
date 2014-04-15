var scan = require('./scan');
var zmq = require('zmq');
var sock = zmq.socket('push');

var port = 5777;

sock.bindSync('tcp://*:' + port);
console.log('Producer bound to port %s', port);

scan.scan("192.168.5", port , function(nodeData) {
    console.log("found one", nodeData);
});

/*setInterval(function(){
  console.log('sending work');
  sock.send('some work');
  }, 500);\
  */


