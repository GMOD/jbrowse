define( ['dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/View/Track/Wiggle'
        ],
        function( declare, array, Wiggle ) {

// feature class for the features we make for the calculated coverage
// values
var CoverageFeature = declare(null, {
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
    getGlobalStats: function() {
        return {};
    },

    readWigData: function( scale, refSeq, leftBase, rightBase, callback ) {
        var coverage = new Array( rightBase-leftBase );
        this.store.iterate(
            leftBase,
            rightBase,
            dojo.hitch( this, function( feature ) {
                            var end = feature.get('end');
                            for( var i = feature.get('start')+1; i <= end; i++ ) {
                                coverage[i-leftBase] = (coverage[i-leftBase] || 0) + 1;
                            }
                        }),
            function () {
                // make fake features from the coverage
                var features = [];
                var currFeat;
                array.forEach( coverage, function( c, i ) {
                    if( currFeat && c == currFeat.score ) {
                            currFeat.end = leftBase+i;
                    } else {
                        if( currFeat )
                            features.push( currFeat );
                        currFeat = new CoverageFeature({ start: leftBase + i - 1, end: leftBase+i, score: c || 0 });
                    }
                });

                callback( features );
            }
        );
    }
});
});