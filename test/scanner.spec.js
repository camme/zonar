var should = require("should");
var zonar = require("../");

describe("The scanner part", function() {

    before(function() {
        var lan = "";
    });

    it("will find another node and emit an event", function(done) {

        var counter = 0;

        var node1 = zonar.create({net: "test", name: "foo"}); 
        var node2 = zonar.create({net: "test", name: "bar"}); 

        node1.on('found', function(foundNode) {
            foundNode.should.have.property('name', 'bar');
            if (++counter == 2) runTests(); 
        });

        node2.on('found', function(foundNode) {
            foundNode.should.have.property('name', 'foo');
            if (++counter == 2) runTests(); 
        });

        function runTests() {
            node1.stop(function() {
                node2.stop(done);
            });
        }

        node1.start();
        node2.start();

    });


    it("will trigger an event with the service name when found", function(done) {

        var counter = 0;

        var node1 = zonar.create({net: "test", name: "foo"}); 
        var node2 = zonar.create({net: "test", name: "bar"}); 

        node1.on('found.bar', function(foundNode) {
            foundNode.should.have.property('name', 'bar');
            if (++counter == 2) runTests(); 
        });

        node2.on('found.foo', function(foundNode) {
            foundNode.should.have.property('name', 'foo');
            if (++counter == 2) runTests(); 
        });

        function runTests() {
            node1.stop(function() {
                node2.stop(done);
            });
        }

        node1.start();
        node2.start();

    });

    it("will create a list of all nodes in the net", function(done) {

        var counter = 0;

        var node1 = zonar.create({net: "test", name: "foo"}); 
        var node2 = zonar.create({net: "test", name: "bar"}); 
        var node3 = zonar.create({net: "test", name: "baq"}); 

        node1.on('found', function(foundNode) { if (++counter == 2) runTests(foundNode); });

        function runTests(foundNode) {

            var nodeList = node1.getList();

            nodeList.should.have.property('bar');
            nodeList.should.have.property('baq');

            node1.stop(function() {
                node2.stop(function() {
                    node3.stop(done);
                });
            });

        }

        node1.start();
        node2.start();
        node3.start();

    });

    it("will throw an error if a new service with a used name is started", function(done) {

        var counter = 0;

        var node1 = zonar.create({net: "test", name: "foo"}); 
        var node2 = zonar.create({net: "test", name: "foo"}); 

        var error = null;
        node2.on('error', function(err) {
            error = err;
        });

        node1.start();

        // if we start them at exactly the same time, we get a strange reaction where
        // both the first and second get the TAKEN error
        setTimeout(function() {

            node2.start();

            setTimeout(function runTest() {
                node1.stop(function() {
                    node2.stop(function() {
                        should.exist(error);
                        done();
                    });
                });
            }, 300);

        }, 10);

    });

    it("will not update the node list if in listen mode", function(done) {

        var counter = 0;

        var node1 = zonar.create({net: "test", name: "foo"}); 
        var node2 = zonar.create({net: "test", name: "bar"}); 
        var node3 = zonar.create({net: "test", name: "baq"}); 

        var c1 = c2 = c3 = 0;
        node1.on('found', function(foundNode) { c1++; });
        node2.on('found', function(foundNode) { c2++; });
        node3.on('found', function(foundNode) { c3++; });

        setTimeout(function runTests() {
            c1.should.be.equal(1);
            c2.should.be.equal(1);
            c3.should.be.equal(2);

            node1.stop(function() {
                node2.stop(function() {
                    node3.stop(done);
                });
            });

        }, 300);

        node1.start();
        node2.start();
        node3.listen();

    });


});


