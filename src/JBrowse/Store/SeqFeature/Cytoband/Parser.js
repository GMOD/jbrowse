define([
           'dojo/_base/declare',
       ],
       function(
           declare
       ) {

return declare( null, {

    constructor: function( args ) {},

    parseFile: function (lines) {

        var cytoLines = lines.split(/\r?\n/);
        var cytoHolder = [];
        for (var line in cytoLines){
            var parsedLine = this._parseCytoBand(cytoLines[line]);
            if (parsedLine){
                cytoHolder.push(parsedLine);
            } else {
                console.warn ("Check line " + (parseInt(line)+1) + ", it is incorrectly formatted.");
            }
        }
    },

    _parseCytoBand : function (line) {
 
        var cytobandRegex = // chrom \t chromStart \t chromEnd \t name \t gieStain 
            /(.+)\t(\d+)\t(\d+)\t(.+)\t(gneg|gpos50|gpos75|gpos25|gpos100|acen|gvar|stalk)/;

        var match = line.match(cytobandRegex);
        match = match && this._checkMatch(match) ? match : undefined;

        if (match) {    //if it's a match, print it, if not, say so
            tmpCytoBand = {
                "chrom" : match[1],
                "chromStart" : match[2],
                "chromEnd" : match[3],
                "name" : match[4],
                "gieStain" : match[5]
            };
            
            console.log(tmpCytoBand);
            return tmpCytoBand;
        } else { 
            return undefined;
        }    
    }

    _checkMatch : function (match) {
        if (match.chromStart <= match.chromEnd){
            return true;
        } else {
            return false;
        }
    }
});
});
