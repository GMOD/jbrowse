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
                thisB._compensateForPotentiallyStupidAcen();
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
        for(var band = 0; band < this.features.length; band++){
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
                gieStain: data.gieStain,
                type: data.type,
                pos: data.pos
            }
        });
    },
    _compensateForPotentiallyStupidAcen: function(){
        var ft = this.features;
        for (var f=0; f < ft.length-1; f++){
            if (ft[f].gieStain !== 'acen' ) continue;
                
            // Only one acen. Do nothing.
            if (ft[f+1].gieStain !== 'acen'){ }

            // 2 acen. Expected, set left and right sides
            else if ( !ft[f+2] || ft[f+2].gieStain !== 'acen'){
                ft[f].pos ='left';
                ft[f+1].pos = 'right';
            }
            // 3+ acen? Join them all, center in the center, 
            // Be upset over shitty data.
            else {
                while (ft[f+1].gieStain ==='acen'){
                    this._mergeAcen(f);
                }
            }
        }
    },
    _mergeAcen: function(f){
        this.features[f].chromEnd = this.features[f+1].chromEnd;
        this.features.splice(f+1,1);
    }
});
});
