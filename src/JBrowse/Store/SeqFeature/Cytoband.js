define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            './Cytoband/Parser',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Model/SimpleFeature',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Store/DeferredStatsMixin'
        ],
        function(
            declare,
            lang,
            Parser,
            XHRBlob,
            SimpleFeature,
            SeqFeatureStore,
            DeferredFeatures,
            DeferredStats
        ) {

return declare([ SeqFeatureStore, DeferredFeatures, DeferredStats ],

{
    constructor: function( args ) {
        this.data = args.blob || new XHRBlob(this.resolveUrl(args.urlTemplate||'data.txt'));
        this.features = [];
        this._loadFeatures();
    },

    _loadFeatures: function() {
        var thisB = this;
        var features = [];
        var parser = new Parser({
            featureCallback : function(f) {
                thisB.features.push(f);
            },
            endCallback : function(){
                thisB._deferred.features.resolve( features );
                thisB._deferred.stats.resolve();

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
            thisB._search( query, featureCallback, finishCallback, errorCallback );
        });
    },

    _search: function( query, featureCallback, finishCallback, errorCallback ) {
        var refName = this.browser.regularizeReferenceName( query.ref );
        var converted = [];
        for(var band in this.features){
            var b = this.features[band];
            var bandRef = this.browser.regularizeReferenceName( b.chrom );
            if ( bandRef === refName && !(b.chromStart > query.end || b.chromEnd < query.start))
            {
                var f = this._formatFeature( b );
                featureCallback(f);
            }
        }
        finishCallback();
    },

    _formatFeature: function(data){
        return new SimpleFeature({
            data:
            {
                start: data.chromStart,
                end: data.chromEnd,
                name: data.name,
                gieStain: data.gieStain                
            }
        });
    }
});
});
