Zonar
=====

A lightweight, super simple discovery tool for finding nodes (or services) in your network

## Why
We wanted to have create all our services as micro services and didnt want to confugre each to know where the others reside. We also dint want a centralized system that has all the configrations but is a single point of failure.

## How to install
Simply install it with npm:

    npm install zonar

## How it works
A node created in broadcasting mode in zonar will automatically broadcast itself to all other nodes. All other nodes will listen to it and reponds when they get the first message. This means that a new node will be automatically be disvovered by all other nodes as soon as it starts broadcasting. 

After the initial connection, each node will begin to send a heartbeat to all nodes so they know its still alive. 

All onodes will recieve a close notice when a node stops broadcasting, unless the node is terminated suddently. In that case, they will unregister it when the heartbeat doesnt come.

## How to use
Since this was developed with simplicity in mind, and we didnt want to have any other functionality besides what is mentioned above, its quite simple to use. You can test these exampels in the [/examples](/examples) folder.

### To create a broadcasting node
This example creates a node that will broadcast itself by the name **foo** and in the net **my-network**.

    // Load zonar
    var zonar = require('zonar');
    
    // Create a new instance. 
    // Give it a name to identify it in the network
    // and a net name, which is kind of a group identifier so 
    // the same network could have isolated groups.
    // The payload property is just the data you want to send as part of the 
    // disvery message. 
    var z = zonar.create({name: 'foo', net: 'my-network', payload: { baq: 'baz'});
    
    // Start broadcasting
    z.start(function(err) {
        if (err) {
            throw err;
        }
    });
    
### Discovering a node
This example will create a node that broadcasts, but will also listen to others

    // Load zonar
    var zonar = require('zonar');
    
    // Create a new instance. 
    var z = zonar.create({name: 'bar', net: 'my-network'});
    
        // Start broadcasting
    z.start(function(err) {
        if (err) {
            throw err;
        }
        
        // This will be triggered whenever a new node is found in the network
        z.on('found', function(node) {
            console.log('found', node);
        });
        
        // This will be triggered whenever a node is dropped/lost in the network
        z.on('dropped', function(node) {
            console.log('dropped', node);
        });
        
    });

In case you just want to listen to a special node, you can use this event instead:

        // This will be triggered whenever a node with the name "foo" is found in the network
        z.on('found.foo', function(node) {
            console.log('found', node);
        });
        
The **dropped** event can also be used in the same way:

        // This will be triggered whenever the node "foo" is dropped/lost in the network
        z.on('dropped.foo', function(node) {
            console.log('dropped', node);
        });
        
        
### Discovering a node in listening mode
Sometimes your application might want to listening to other nodes in the nework, but it doesnt need to be dsicoverable. In that case, you dont need to give it a **name** and you start it with .listen() instead of .start():


    // Load zonar
    var zonar = require('zonar');
    
    // Create a new listening instance. 
    var z = zonar.create({net: 'my-network'});
    
        // Start broadcasting
    z.listen(function(err) {
        if (err) {
            throw err;
        }
        
        // This will be triggered whenever a new node is found in the network
        z.on('found', function(node) {
            console.log('found', node);
        });
        
    });
    
    
## Payload
The payload property is where we can send custom info to the node that disvover us. It is in the payload that you would normally put your connection string, or your port number. The ip address will be part of the standard info, so that part isnt needed, but you might want to send other information as well.

### ZMQ example:

This example needs zmq installed on your computer. 

On Mac OS X you can install it with brew:

    brew install zmq
   
On Ubuntu etc you can install it with apt-get [more info here](http://zeromq.org/distro:debian):

    sudo apt-get install libzmq-dev
   
Install the node zmq bindings as well:

    npm install zmq
    
Now you could create a zmq service that is discoverable like this:

    var zonar = require('zonar');
    var zmq = require('zmq');
    
    // We create a zmq publishing socket
    var socket = zmq.socket('pub');
    var port = 8989;
    
    // Create a new instance with a payload containg the port of the zmq socket
    var z = zonar.create({name: 'time', net: 'my-network', payload: { port: port});
    
    // Bind it
    socket.bindSync('tcp://*:' + port);
    
    // Start broadcasting
    z.start(function(err) {
    
        if (err) {
            throw err;
        }
        
        // Send the time each second to all subscribers of "time"
        setInterval(function() {
            socket.send('time ' + (new Date()).toString());
        });
        
    });
    
 And this is the consumer of the service:
 
    var zonar = require('zonar');
    var zmq = require('zmq');
    
    // We create a zmq subscriber socket
    var socket = zmq.socket('sub');
    
    // Create a new instance that listens
    var z = zonar.create({net: 'my-network'});
    
    socket.on('message', function(data) {
        console.log('Got: ', data.toString();
    });
    
    // Start broadcasting
    z.listen(function(err) {
    
        if (err) {
            throw err;
        }
        
        z.on('found.time', function(node) {
            socket.connect(node.address + ':' + node.payload.port);
            socket.subscribe('time');
        });

        z.on('dropped.time', function(node) {
            socket.disconnect();
        });
        
    });
    
## Missing features
These are things that I will try to implement as soon as possible:

* Create examples in examples folder
* Custom heartbeat timer, so that each node can have a custom timer
* Broadcast to all networks, ie if you have multiple networks it should send the broardcast to all of them (currently it just picks the first)
* More tests
* Better errors when something unexpected happems