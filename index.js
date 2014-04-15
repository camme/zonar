var mesh = require('./lib/mesh'); 

if(require.main === module) {
    mesh.init({
        port: 5777
    });
} else {
    module.exports = mesh;
}


