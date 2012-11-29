define( ['dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/View/Track/Wiggle',
         'JBrowse/Util'
        ],
        function( declare, array, Wiggle, Util ) {

// feature class for the features we make for the calculated coverage
// values
var CoverageFeature = Util.fastDeclare(
    {
        get: function(f) { return this[f]; },
        tags: function() { return [ 'start', 'end', 'score' ]; },
        score: 0,
        constructor: function( args ) {
            this.start = args.start;
            this.end = args.end;
            this.score = args.score;
        }
    });

return declare( Wiggle,
{

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                min_score: 0
            }
        );
    },

    getGlobalStats: function() {
        return {};
    },

    getFeatures: function( query, featureCallback, finishCallback, errorCallback ) {
        var leftBase  = query.start;
        var rightBase = query.end;
        var coverage = new Array( rightBase-leftBase );
        this.store.getFeatures(
            query,
            dojo.hitch( this, function( feature ) {
                            var end = feature.get('end');
                            for( var i = feature.get('start')+1; i <= end; i++ ) {
                                coverage[i-leftBase] = (coverage[i-leftBase] || 0) + 1;
                            }
                        }),
            function () {
                // make fake features from the coverage
                var currFeat;
                array.forEach( coverage, function( c, i ) {
                    if( currFeat && c == currFeat.score ) {
                            currFeat.end = leftBase+i;
                    } else {
                        if( currFeat )
                            featureCallback( currFeat );
                        currFeat = new CoverageFeature({ start: leftBase + i - 1, end: leftBase+i, score: c || 0 });
                    }
                });

                finishCallback();
            }
        );
    }
});
});