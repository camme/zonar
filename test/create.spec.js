var should = require("should");
var zonar = require("../");

describe("Create", function() {

    it("will fail if no name is provided", function() {

        var error = null;
        try{
            var node = zonar.create({}); 
            node.start();
        } catch (err) {
            error = err;
        }

        should.exist(error);

    });


    it("will not fail if no name is provided and run in listen mode", function() {

        var error = null;
        try{
            var node = zonar.create({}); 
            node.listen();
        } catch (err) {
            error = err;
        }

        should.not.exist(error);

    });



    it("takes the payload as json by default if the payload is an object", function(done) {

        var node = zonar.create({
            name: "hej",
            payload: {
                port: 1,
                foo: "bar"
            }
        }); 

        node.start(function() {
            var message = node._private.createMessage("FOO").toString();
            var expected = 'ZONAR ' + zonar.compabilityVersion + ' zon ' + node.id + ' hej ' + node.port + ' FOO 22:{"port":1,"foo":"bar"}';
            message.should.be.equal(expected);
            node.stop(done);
        });

    });


});


