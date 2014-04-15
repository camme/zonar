var should = require("should");
var mesh = require("../");
var ipAddresses = require("../lib/ipaddresses");
var scanner = require("../lib/scanner");

describe.skip("The scanner module", function() {

    before(function() {
        var lan = "";
        var addresses = ipAddresses.get();
        this.ip = addresses[0];
    });

    it("will find another node when given a port range", function(done) {

        var node1 = mesh.init({autoScan: false, port: 5777});
        var node2 = mesh.init({autoScan: false, port: 5778});
        var node3 = mesh.init({autoScan: false, port: 5779});

        var amount = 0;

        function found() {
            amount++;
            if (amount == 3) {
                node1.stop();
                node2.stop();
                node3.stop();
                done();
            }
        }

        scanner.scan(this.ip, "5777-5779", {}, found);

    });
    
});


