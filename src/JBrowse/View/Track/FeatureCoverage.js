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
                min_score: 0,
                max_score: 100
            }
        );
    },

    getGlobalStats: function() {
        return {};
    },

    getFeatures: function( query, featureCallback, finishCallback, errorCallback ) {
        var leftBase  = query.start;
        var rightBase = query.end;
        var scale = query.scale; // px/bp
        var widthBp = rightBase-leftBase;
        var widthPx = widthBp * ( query.scale || 1/query.basesPerSpan);

        var binWidth = Math.ceil( query.basesPerSpan ); // in bp

        var coverageBins = new Array( Math.ceil( widthBp/binWidth ) );
        var binOverlap = function( bp, isRightEnd ) {
            var binCoord  = (bp-leftBase) / binWidth;
            var binNumber = Math.floor( binCoord );
            var overlap   = isRightEnd ? 1-(binCoord-binNumber) : binCoord - binNumber;
            return {
                bin: binNumber,
                overlap: overlap // between 0 and 1: proportion of this bin that the feature overlaps
            };
        };

        this.store.getFeatures(
            query,
            dojo.hitch( this, function( feature ) {
                            var start = feature.get('start')-1;
                            var end = feature.get('end')-1;
                            var startBO = binOverlap( start, false );
                            var endBO   = binOverlap( end,   true  );

                            // increment start and end partial-overlap bins by proportion of overlap
                            if( startBO.bin == endBO.bin ) {
                                coverageBins[startBO.bin] = (coverageBins[startBO.bin] || 0) + endBO.overlap + startBO.overlap - 1;
                            }
                            else {
                                coverageBins[startBO.bin] = (coverageBins[startBO.bin] || 0) + startBO.overlap;
                                coverageBins[endBO.bin]   = (coverageBins[endBO.bin]   || 0) + endBO.overlap;
                            }

                            // increment completely overlapped interior bins by 1
                            for( var i = startBO.bin+1; i <= endBO.bin-1; i++ ) {
                                coverageBins[i] = (coverageBins[i] || 0) + 1;
                            }
                        }),
            function () {
                // make fake features from the coverage
                for( var i = 0; i < coverageBins.length; i++ ) {
                    var score = (coverageBins[i] || 0);
                    var bpOffset = leftBase+binWidth*i;
                    featureCallback( new CoverageFeature({
                        start: bpOffset,
                        end:   bpOffset+binWidth,
                        score: score
                     }));
                }
                finishCallback();
            }
        );
    }
});
});