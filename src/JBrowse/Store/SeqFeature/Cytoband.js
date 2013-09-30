define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'JBrowse/Model/SimpleFeature',
            './Cytoband/Parser',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Store/DeferredStatsMixin'
        ],
        function(
            declare,
            lang,
            SimpleFeature,
            Parser,
            SeqFeatureStore,
            DeferredFeatures,
            DeferredStats
        ) {

return declare([ SeqFeatureStore, DeferredFeatures, DeferredStats ],

{
    constructor: function( args ) {
        this.data = args.blob;
        this._loadFeatures();
        this.browser = args.browser;
    },

    _loadFeatures: function() {
        this.stuff = {features: []};
        var thisB = this;
        var features = this.bareFeatures = [];
        var parseFinished, fetched;
        var parser = new Parser({
            featureCallback : function(f) {
                thisB.stuff.features.push(f);
            },
            endCallback : function(){
                console.log("End of Constructor => "+JSON.stringify(thisB.stuff));
                thisB._deferred.features.resolve( features );
            }
        });

        this.data.fetchLines(
            function( line ) {
                parser.addLine(line);
            },
            lang.hitch( parser, 'finish' ),
            lang.hitch( this, '_failAllDeferred' )
        );

    },

    _getFeatures: function( query, featureCallback, finishCallback, errorCallback ){
        var thisB = this;
        this._deferred.features.then( function() {
            thisB._search( query, featureCallback, finishedCallback, errorCallback );
        });
    },

    _search: function( query, featureCallback, finishCallback, errorCallback ) {
        var refName = this.browser.regularizeReferenceName( query.ref );
        
        console.log("getFeatures => " +JSON.stringify(this.stuff.features));

        for(var band in this.stuff.features){
            console.log("band => " + JSON.stringify(band));            
        }
    }
});
});
