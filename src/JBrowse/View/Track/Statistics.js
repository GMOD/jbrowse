define( [
            'dojo/_base/declare',
            'JBrowse/View/Track/Wiggle/XYFunction',
            'JBrowse/Util',
        ],
        function( declare, XYFunction, Util ) {

var Statistics = declare( XYFunction, {

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                valuesToPlot: { mean: 'mean_color',
                                stdev: 'sdev_color',
                                max: 'max_color',
                                min: 'min_color'
                              },
                style: {
                    mean_color: 'black',
                    sdev_color: '#41A317',
                    max_color: '#C34A2C',
                    min_color: 'blue',
                    origin_color: '#888'
                },
            }
        );
    },

    _calculatePixelScores: function( canvasWidth, features, featureRects ) {
        // make an array of the max score at each pixel on the canvas
        var pixelValues = new Array( canvasWidth );
        dojo.forEach( features, function( f, i ) {
            var store = f.source;
            var fRect = featureRects[i];
            var jEnd = fRect.r;
            var score = f.get('score');
            for( var j = Math.round(fRect.l); j < jEnd; j++ ) {
                if ( pixelValues[j] && pixelValues[j]['lastUsedStore'] == store ) {
                    /* Note: if the feature is from a different store, the condition should fail,
                     *       and we will add a new value, rather than adjusting the current one */
                    pixelValues[j]['score'][store] = Math.max( pixelValues[j]['score'][store], score );
                }
                else if ( pixelValues[j] ) {
                    pixelValues[j]['score'][store] = score;
                    pixelValues[j]['lastUsecStore'] = store;
                }
                else {
                    pixelValues[j] = {};
                    pixelValues[j]['score'] = {};
                    pixelValues[j]['score'][store] = score;
                    pixelValues[j]['lastUsecStore'] = store;
                }
            }
        },this);
        // when done looping through features, forget the store information.
        for (var i=0; i<pixelValues.length; i++) {
            if ( pixelValues[i] ) {
                pixelValues[i].mean = 0;
                pixelValues[i].stdev = 0;
                var n = 0;
                for (var key in pixelValues[i]['score'] ) {
                    if ( pixelValues[i]['score'].hasOwnProperty(key) ) {
                        // add values for mean
                        pixelValues[i].mean += pixelValues[i]['score'][key];
                        // add max
                        pixelValues[i].max = pixelValues[i].max 
                                             ? Math.max( pixelValues[i].max, pixelValues[i]['score'][key] )
                                             : pixelValues[i]['score'][key];
                        // add min
                        pixelValues[i].min = pixelValues[i].min 
                                             ? Math.min( pixelValues[i].min, pixelValues[i]['score'][key] )
                                             : pixelValues[i]['score'][key];
                        // increment number of stores
                        n++;
                    }
                }
                pixelValues[i].mean /= n;
                for (var key in pixelValues[i]['score'] ) {
                    if ( pixelValues[i]['score'].hasOwnProperty(key) ) {
                        // sum squares of deviation
                        pixelValues[i].stdev += Math.pow( pixelValues[i].mean - pixelValues[i]['score'][key], 2);
                    }
                }
                pixelValues[i].stdev = Math.sqrt( pixelValues[i].stdev / n );
                // remove unwanted properties
                delete pixelValues[i]['score'];
                delete pixelValues[i]['lastUsedStore'];
            }
        }
        for (var i=0; i<pixelValues.length; i++) {
            if ( !pixelValues[i] ) {
                pixelValues[i] = []; // if there is no data, set to empty (will be ignored by drawing methods)
            }
        }
        return pixelValues;
    },

    _makeScoreDisplay: function( scale, leftBase, rightBase, block, canvas, features, featureRects, pixels ) {
        // TODO: define this
    }

});
return Statistics;
});