define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/Util',
            'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/View/Track/Alignments/MismatchesMixin'
        ],
        function( declare, array, Util, CanvasFeatureTrack, MismatchesMixin ) {

return declare( [ CanvasFeatureTrack, MismatchesMixin ], {
    constructor: function() {

        // if showMismatches is false, stub out this object's
        // _drawMismatches to be a no-op
        if( ! this.config.style.showMismatches )
            this._drawMismatches = function() {};
    },

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                //maxFeatureScreenDensity: 400
                layoutPitchY: 3,
                style: {
                    bgcolor: function( feature ) {
                        var missing_mate = feature.get('multi_segment_template') && !feature.get('multi_segment_all_aligned');
                        var strand = feature.get('strand');
                        return                  missing_mate ? this.getStyle( feature, 'bgcolor_missing_mate' ) :
                               strand == 1  || strand == '+' ? this.getStyle( feature, 'bgcolor_fwd_strand' )   :
                               strand == -1 || strand == '-' ? this.getStyle( feature, 'bgcolor_rev_strand' )   :
                                                               this.colorForBase('reference');
                    },
                    bgcolor_fwd_strand: '#EC8B8B',
                    bgcolor_rev_strand: '#898FD8',
                    bgcolor_missing_mate: '#D11919',
                    fgcolor: 'rgba(60,60,60,0.8)',
                    height: 3,
                    marginBottom: 0,
                    showMismatches: true,
                    font: '10px sans-serif'
                }
            }
        );
    },

    // draw each feature
    renderFeature: function( context, viewArgs, fRect ) {
        // background
        var bgcolor = this.getStyle( fRect.f, 'bgcolor' );
        if( bgcolor ) {
            context.fillStyle = bgcolor;
            context.fillRect( fRect.l, fRect.t, fRect.w, fRect.h );
        }

        // draw mismatches if zoomed in far enough
        if( viewArgs.scale > 0.3 )
            this._drawMismatches( context, viewArgs, fRect );

        // foreground border
        var fgcolor = this.getStyle( fRect.f, 'fgcolor' );
        if( fgcolor ) {
            if( fRect.h > 3 ) {
                context.lineWidth = 1;
                context.strokeStyle = fgcolor;

                // need to stroke a smaller rectangle to remain within
                // the bounds of the feature's overall height and
                // width, because of the way stroking is done in
                // canvas.  thus the +0.5 and -1 business.
                context.strokeRect( fRect.l+0.5, fRect.t+0.5, fRect.w-1, fRect.h-1 );
            } else {
                context.fillStyle = fgcolor;
                context.fillRect( fRect.l, fRect.t+fRect.h-1, fRect.w, 1 );
            }
        }
    },

    _drawMismatches: function( context, viewArgs, fRect ) {
        var feature = fRect.f;
        var scale = viewArgs.scale;
        // recall: scale is pixels/basepair

        if ( fRect.w > 1 ) {
            var mismatches = this._getMismatches( feature );
            var charSize = this.getCharacterMeasurements( context );
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

                if( mRect.w >= charSize.w && mRect.h >= charSize.h ) {
                    context.font = this.config.style.font;
                    context.fillStyle = 'black';
                    context.fillText( mismatch.base, mRect.l+(mRect.w-charSize.w)/2+1, mRect.t+mRect.h-(mRect.h-charSize.h)/2-1 );
                }
            },this);
        }
    },

    getCharacterMeasurements: function( context ) {
        return this.charSize = this.charSize || function() {
            var fpx = (this.config.style.font.match(/(\d+)px/i)||[])[1] || Infinity;
            return { w: fpx, h: fpx };
        }.call(this);
    }
});
});