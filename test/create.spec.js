var should = require("should");
var zonar = require("../");

describe("Create", function() {

    it("will fail if no name is provided", function() {

        var error = null;
        try{
            var node = zonar.create({}); 
        } catch (err) {
            error = err;
        }

        should.exist(error);
        
    });
    
});


