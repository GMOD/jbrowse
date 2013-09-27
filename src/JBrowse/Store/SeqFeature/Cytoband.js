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
        this._loadFeatures();
        this.browser = args.browser;
    },

    _loadFeatures: function() {
        this.stuff = {features: []};
        var that = this;
        var parseFinished, fetched;
        var p = new Parser({
            featureCallback : function(f) {
                that.stuff.features.push(f);
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
            console.log("End of Constructor => "+JSON.stringify(that.stuff.features));
        })

    },

    getFeatures: function( query, featureCallback, finishCallback, errorCallback ){
        var refName = this.browser.regularizeReferenceName( query.ref );
        
        console.log("getFeatures => " +JSON.stringify(this.features));

        for(var band in this.stuff.features){
            console.log(JSON.stringify(band));            
        }
    }
});
});
