define( [
            'dojo/_base/declare',
            'JBrowse/Model/SimpleFeature',
            './Cytoband/Parser',
            'JBrowse/Model/XHRBlob'
        ],
        function(
            declare,
            SimpleFeature,
            Parser,
            XHRBlob
        ) {

return declare(null,

{
    constructor: function( args ) {
        this.data = args.blob;
        this.features = [];
        this._loadFeatures();
    },

    _loadFeatures: function() {
        var stuff = {features: []};
        var parseFinished, fetched;
        var p = new Parser({
            featureCallback : function(f) {
                stuff.features.push(f);
            },
            endCallback : function(){
                parseFinished = true;
            }
        });

        this.data.fetchLines( function(l) { p.addLine(l);     },
                              function( ) { p.finish();       },
                              function(e) { console.error(e); } );
        waitsFor( function() { return parseFinished; } );
        runs(function(){
            console.log();
        })

    },

    getFeatures: function( query, featureCallback, finishCallback, errorCallback ){
        for(i=0; i<stuff.features.length(); i++){
            
        }
    }
});
});
