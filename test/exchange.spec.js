var should = require("should");
var mesh = require("../");
var ipAddresses = require("../lib/ipaddresses");
var scanner = require("../lib/scanner");

describe("The Exchange functionality", function() {

    before(function() {
        var lan = "";
        var addresses = ipAddresses.get();
        this.ip = addresses[0];
    });

    it("will send list of nodes to each other", function(done) {

        this.timeout(5000);

        console.log("");
        var node1 = mesh.init({name: "foo.service", port: 5777 });
        var node2 = mesh.init({name: "bar.service", port: 5778 });
        var node3 = mesh.init({name: "baq.service", port: 5779 });

    });
    
});


