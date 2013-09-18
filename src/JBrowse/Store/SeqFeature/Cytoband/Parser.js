define([
           'dojo/_base/declare',
           'dojo/_base/lang',
       ],
       function(
           declare,
           lang
       ) {

return declare( null, {

    constructor: function( args ) {
        lang.mixin( this, {
                        featureCallback:   args.featureCallback || function() {},
                        endCallback:       args.endCallback || function() {},
                        errorCallback:     args.errorCallback || function(e) { console.error(e); },
        });
        
    },
    
    addLine: function (line) {
 
        var cytobandRegex = // chrom \t chromStart \t chromEnd \t name \t gieStain 
            /(.+)\t(\d+)\t(\d+)\t(.+)\t(gneg|gpos50|gpos75|gpos25|gpos100|acen|gvar|stalk)/;
        
        var match = [];
        if (this._checkMatch(match = line.match(cytobandRegex))){
            var tmpCytoband = {
                "chrom" : match[1],
                "chromStart" : parseInt(match[2]),
                "chromEnd" : parseInt(match[3]),
                "name" : match[4],
                "gieStain" : match[5]
            };
        this.featureCallback(tmpCytoband)
        } 
        else if (/^\s*$/.test(line)) { //Do nothing, empty line
        } 
        else { //error
            line = line.replace( /\r?\n?$/g, '' );
            throw "Cytoband parse error.  Cannot parse '"+line+"'.";
        }
    },

    finish : function (){
        this.endCallback();
    },
    
    _checkMatch : function (match) {
        if (match && (parseInt(match[2]) <= parseInt(match[3]))){ //start <= finish
            return true;
        } else {
            return false;
        }
    }
});
});
