var should = require("should");
var Hitta = require("../").Hitta;
var ipAddresses = require("../lib/ipaddresses");
var scanner = require("../lib/scanner");

describe("The Exchange functionality", function() {

    before(function() {
        var lan = "";
        var addresses = ipAddresses.get();
        this.ip = addresses[0];
    });

    it("will send list of nodes to each other", function(done) {

        this.timeout(20000);

        var node1 = new Hitta({id: "foo.service", port: 5777});
        var node2 = new Hitta({id: "bar.service", port: 5778});
        var node3 = new Hitta({id: "baq.service", port: 5779});
        var node4 = new Hitta({id: "zor.service", port: 5779});

        node1.start();
        setTimeout(function() {node2.start()}, 2000);
        setTimeout(function() {node3.start()}, 5000);
        setTimeout(function() {node4.start()}, 8000);



        console.log("");

    });
    
});


