var hitta = require("../");
var program = require('commander');

program
    .version('0.0.1')
    .option('-i, --id', 'ID of service')
    .option('-p, --port', 'Port of service')
    .option('-x, --extrapayload', 'Extr payload')
    .parse(process.argv);

var options = {id: program.id, port: program.port };

if (program.extrapayload) {
    options.payload = program.extrapayload;
}

var node = hitta.create(options);

node.start();


