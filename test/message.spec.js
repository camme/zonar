var zonar = require("../");
var should = require("should");

describe("The messagess", function() {

    it("will be created according to the protocol", function(done) {

        var node = zonar.create({name: "foo", payload: "bar baq baz"}); 
        node.start(function() {
            var message = node._private.createMessage("BAR").toString();
            message.should.be.equal('ZONAR ' + zonar.compabilityVersion + ' zon ' + node.id + ' foo ' + node.port + ' BAR 11:bar baq baz');
            node.stop(done);
        });

    });

    it("will ibe parsed into correct information", function(done) {

        var node = zonar.create({name: "foo", payload: "bar baq baz"}); 
        node.start(function() {

            var message = node._private.createMessage("BAR");

            var parsedMessage = node._private.parseMessage(message, { address: "1.2.3.4" });

            parsedMessage.should.have.property('id', node.id);
            parsedMessage.should.have.property('name', 'foo');
            parsedMessage.should.have.property('port', node.port);
            parsedMessage.should.have.property('status', 'BAR');
            parsedMessage.should.have.property('payload', 'bar baq baz');
            parsedMessage.should.have.property('address', "1.2.3.4");

            node.stop(done);
        });

    });
 
    
});


