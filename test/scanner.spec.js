var should = require("should");
var zonar = require("../");

describe("The scanner part", function() {

    before(function() {
        var lan = "";
    });

    it("will find another node and emit an event", function(done) {

        var counter = 0;
        
        var node1 = zonar.create({name: "foo"}); 
        var node2 = zonar.create({name: "bar"}); 

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

    it("will create a list of all nodes in the net", function(done) {

        var counter = 0;
        
        var node1 = zonar.create({name: "foo"}); 
        var node2 = zonar.create({name: "bar"}); 
        var node3 = zonar.create({name: "baq"}); 

        node1.on('found', function(foundNode) { if (++counter == 2) runTests(foundNode); });
        //node2.on('found', function(foundNode) { if (++counter == 3) runTests(foundNode); });
        //node3.on('found', function(foundNode) { if (++counter == 3) runTests(foundNode); });

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

});


