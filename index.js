var zonar = require('./lib/zonar'); 

if(require.main === module) {
    zonar.init({ id: "zonar-" + (new Date()).getTime() });
} else {
    module.exports = zonar;
}


