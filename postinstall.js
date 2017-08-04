var appPath = require("app-root-path").path;
var modPath = ""+require("shelljs").pwd();
var fs = require("fs-extra");

console.log(">>> postinstall");
console.log("appPath",appPath,"modPath",modPath);

copyMod('dojo','dojo');
copyMod('dijit','dijit');
copyMod('dojox','dojox');
copyMod('jszlib','jszlib');
copyMod('json-schema','json-schema');
copyMod('lazyload','lazyload');
copyMod('dgrid','dgrid');
copyMod('jDataView','jDataView');
copyMod('dojo-util','util');
copyMod('filesaver.js','FileSaver');
copyMod('dojo-dstore','dstore');


function copyMod(from,to) {
    var src = appPath+"/node_modules/"+from;
    var trg = modPath+"/src/"+to;

    // delete the old dir from src dir and make a current copy
    fs.remove(trg)
    .then(function() {
        return fs.copy(src, trg);
    })
    .then(function() {
        console.log("copied",trg);
    })
    .catch(err => {
      console.error(err);
    });
}