var hitta = require("../");
var program = require('commander');

program
    .version('0.0.1')
    .option('-i, --id [id]', 'ID of service')
    .option('-t, --time [time]', 'Time delay for keep alive in ms')
    .option('-p, --port [port]', 'Port of service')
    .option('-x, --extrapayload [extrapayload]', 'Extr payload')
    .parse(process.argv);

var options = {id: program.id };

if (program.extrapayload) {
    options.payload = program.extrapayload;
}

if (program.port) {
    options.port = program.port;
}


if (program.time) {
    options.pulseTimer = program.time;
}

var node = hitta.create(options);

node.on('found', function(info) {
    console.log("Discovered new service '%s' on %s:%s", info.id, info.address, info.port);
});

node.on('dropped', function(info) {
    console.log("Dropped service '%s' on %s:%s", info.id, info.address, info.port);
});

process.on( 'SIGINT', function() {
    node.stop(function() {
    process.exit( );
    });
})

node.start();


