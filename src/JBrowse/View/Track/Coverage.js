define( ['dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/View/Track/Wiggle'
        ],
        function( declare, array, Wiggle ) {

var CoverageFeature = declare(null,
{ get: function(f) { return this[f]; },
  tags: function() { return [ 'start', 'end', 'score' ]; },
  score: 0,
  constructor: function( args ) {
      dojo.safeMixin( this, args );
  }
});

return declare( Wiggle,
{
    getGlobalStats: function() {
        return { scoreMax: 35, scoreMin: 0, scoreStdDev: 20, scoreMean: 20 };
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
                            currFeat.end = leftBase+i+1;
                    } else {
                        if( currFeat )
                            features.push( currFeat );
                        currFeat = new CoverageFeature({ start: leftBase + i, end: leftBase+i+1, score: c || 0 });
                    }
                });

                callback( features );
            }
        );
    }
});
});