var appPath = require("app-root-path").path;
var shelljs = require("shelljs");
var modPath = ""+shelljs.pwd();
var fs = require("fs-extra");
var async = require("async");


console.log(">>> postinstall");
console.log("appPath",appPath,"modPath",modPath);

// list of directories to copy
var dirList = [
    {src:'dojo',trg:'dojo'},
    {src:'dijit',trg:'dijit'},
    {src:'dojox',trg:'dojox'},
    {src:'jszlib',trg:'jszlib'},
    {src:'json-schema',trg:'json-schema'},
    {src:'lazyload',trg:'lazyload'},
    {src:'dgrid',trg:'dgrid'},
    {src:'jDataView',trg:'jDataView'},
    {src:'dojo-util',trg:'util'},
    {src:'filesaver.js',trg:'FileSaver'},
    {src:'dojo-dstore',trg:'dstore'}
];

async.each(dirList,
    function(item, cb){
        var src = appPath+"/node_modules/"+item.src;
        var trg = modPath+"/src/"+item.trg;

        // delete the old dir from src dir and make a current copy
        fs.remove(trg)
        .then(function() {
            return fs.copy(src, trg);
        })
        .then(function() {
            console.log("copied",trg);
            cb();
        })
        .catch(function(err) {
            console.log("error",err);
            cb(err);
        });

    },
    // done copying all directories
    function(err){
        if (err) {
            console.log("error",err);
            return;
        }
        console.log("copying scripts to app root");

        var src = modPath+"/utils/jb_*";
        var trg = appPath;

        shelljs.cp(src,trg);

        console.log("postinstall done");
    }
);

