define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/Util',
            'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/View/Track/Alignments/MismatchesMixin'
        ],
        function( declare, array, Util, CanvasFeatureTrack, MismatchesMixin ) {

return declare( [ CanvasFeatureTrack, MismatchesMixin ], {
    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                //maxFeatureScreenDensity: 400
                layoutPitchY: 3,
                style: {
                    bgcolor: '#aaa',
                    height: 3,
                    marginBottom: 0,
                    showMismatches: true
                }
            }
        );
    },

    renderFeatures: function( viewArgs, canvas, fRects ) {
        this.inherited( arguments );

        var scale = viewArgs.scale;

        if( this.config.style.showMismatches )  {
            array.forEach( fRects, function(rect) {
                this._drawMismatches( viewArgs, canvas, rect );
            }, this );
        }
    },

    _drawMismatches: function( viewArgs, canvas, fRect ) {
        var context = canvas.getContext('2d');
        var feature = fRect.f;
        var scale = viewArgs.scale;
        // recall: scale is pixels/basepair

        if ( fRect.w > 1 ) {
            var mismatches = this._getMismatches( feature );
            var charSize = this.getCharacterMeasurements();
            var drawChars = scale >= charSize.w && fRect.h >= charSize.h;
            array.forEach( mismatches, function( mismatch ) {
                var start = feature.get('start') + mismatch.start;
                var end = start + mismatch.length;

                var mRect = {
                    h: fRect.h,
                    l: fRect.toX( start ),
                    t: fRect.t
                };
                mRect.w = fRect.toX( end ) - mRect.l;

                context.fillStyle = this.colorForBase( mismatch.base );
                context.fillRect( mRect.l, mRect.t, mRect.w, mRect.h );
            },this);
        }
    },

    getCharacterMeasurements: function() {
        return { w: 10, h: 10 };
    }
});
});