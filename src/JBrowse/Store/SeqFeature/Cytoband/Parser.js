define([
           'dojo/_base/declare',
       ],
       function(
           declare
       ) {

return declare( null, {

    constructor: function( args ) {
        lang.mixin( this, {
                        featureCallback:   args.featureCallback || function() {},
                        endCallback:       args.endCallback || function() {},
                        errorCallback:     args.errorCallback || function(e) { console.error(e); },
        });
        
    },

    parseFile: function (lines) {

        var cytoLines = lines.split(/\r?\n/);
        var cytoHolder = [];
        for (var line in cytoLines){
            var parsedLine = this.addLine(cytoLines[line]);
            if (parsedLine){
                cytoHolder.push(parsedLine);
            } else {
                console.warn ("Check line " + (parseInt(line)+1) + ", it is incorrectly formatted.");
            }
        }
    },
    
    addLine: function (line) {
 
        var cytobandRegex = // chrom \t chromStart \t chromEnd \t name \t gieStain 
            /(.+)\t(\d+)\t(\d+)\t(.+)\t(gneg|gpos50|gpos75|gpos25|gpos100|acen|gvar|stalk)/;

        if (this._checkMatch(match = line.match(cytobandRegex))){
            tmpCytoBand = {
                "chrom" : match[1],
                "chromStart" : match[2],
                "chromEnd" : match[3],
                "name" : match[4],
                "gieStain" : match[5]
            };
            //do something with tmp
        } 
        else if (/^\s*$/.test(line)) { //Do nothing, empty line
        } 
        else { //error
            line = line.replace( /\r?\n?$/g, '' );
            throw "GFF3 parse error.  Cannot parse '"+line+"'.";
        }
    },

    finish : function (){

    },
    
    _checkMatch : function (match) {
        if (match && (match.chromStart <= match.chromEnd)){
            return true;
        } else {
            return false;
        }
    }
});
});
