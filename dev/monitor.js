var zonar = require('../');
var z = zonar.create({net: 'tjena'});
z.listen(function() {
   
   z.on('found', function(item) {
        console.log("Found %s", item.name);
   }); 

   z.on('dropped', function(item) {
        console.log("Dropped %s", item.name);
   }); 


});
