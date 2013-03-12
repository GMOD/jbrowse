define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/Util',
            'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/View/Track/_AlignmentsMixin'
        ],
        function( declare, array, Util, CanvasFeatureTrack, AlignmentsMixin ) {

return declare( [ CanvasFeatureTrack, AlignmentsMixin ], {
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
                style: {
                    color: function( feature ) {
                        var missing_mate = feature.get('multi_segment_template') && !feature.get('multi_segment_all_aligned');
                        var strand = feature.get('strand');
                        return                  missing_mate ? this.getStyle( feature, 'color_missing_mate' ) :
                               strand == 1  || strand == '+' ? this.getStyle( feature, 'color_fwd_strand' )   :
                               strand == -1 || strand == '-' ? this.getStyle( feature, 'color_rev_strand' )   :
                                                               this.colorForBase('reference');
                    },
                    color_fwd_strand: '#EC8B8B',
                    color_rev_strand: '#898FD8',
                    color_missing_mate: '#D11919',
                    border_color: null,
                    height: 7,
                    marginBottom: 1,
                    showMismatches: true,
                    mismatchFont: 'bold 10px Courier New,monospace'
                }
            }
        );
    },

    // draw each feature
    renderFeature: function( context, viewArgs, fRect ) {
        this.inherited( arguments );

        // draw mismatches if zoomed in far enough
        if( viewArgs.scale > 0.3 )
            this._drawMismatches( context, viewArgs, fRect );
    },

    _drawMismatches: function( context, viewArgs, fRect ) {
        var feature = fRect.f;
        var scale = viewArgs.scale;
        // recall: scale is pixels/basepair

        if ( fRect.w > 1 ) {
            var mismatches = this._getMismatches( feature );
            var charSize = this.getCharacterMeasurements( context );
            array.forEach( mismatches, function( mismatch ) {
                var start = feature.get('start') + mismatch.start;
                var end = start + mismatch.length;

                // if bolean track, check if mismatch is in spans
                if ( viewArgs.block.maskingSpans ) {
                    var thisB = this;
                    array.forEach( viewArgs.block.maskingSpans, function( span ) {
                        if (span.start <= start && end <= span.end ) {
                            context.globalAlpha = thisB.config.style.masked_transparancy;
                        }
                    });
                }

                var mRect = {
                    h: fRect.h,
                    l: fRect.toX( start ),
                    t: fRect.t
                };
                mRect.w = fRect.toX( end ) - mRect.l;

                if( mismatch.type == 'mismatch' || mismatch.type == 'deletion' ) {
                    context.fillStyle = this.colorForBase( mismatch.base );
                    context.fillRect( mRect.l, mRect.t, mRect.w, mRect.h );

                    if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                        context.font = this.config.style.mismatchFont;
                        context.fillStyle = mismatch.type == 'deletion' ? 'white' : 'black';
                        context.fillText( mismatch.base, mRect.l+(mRect.w-charSize.w)/2+1, mRect.t+mRect.h-(mRect.h-charSize.h+4)/2 );
                    }
                }
                else if( mismatch.type == 'insertion' ) {
                    context.fillStyle = 'black';
                    context.fillRect( mRect.l-1, mRect.t, 2, mRect.h );
                    if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                        context.font = this.config.style.mismatchFont;
                        context.fillStyle = 'black';
                        context.fillText( '('+mismatch.base+')', mRect.l+2, mRect.t+mRect.h-(mRect.h-charSize.h+4)/2 );
                    }
                }
                else if( mismatch.type == 'skip' ) {
                    context.clearRect( mRect.l, mRect.t, mRect.w, mRect.h );
                    context.fillStyle = '#333';
                    context.fillRect( mRect.l, mRect.t+(mRect.h-2)/2, mRect.w, 2 );
                }
                context.globalAlpha = 1; // always return to full opacity
            },this);
        }
    },

    getCharacterMeasurements: function( context ) {
        return this.charSize = this.charSize || function() {
            var fpx;

            try {
                fpx = (this.config.style.mismatchFont.match(/(\d+)px/i)||[])[1];
            } catch(e) {}

            fpx = fpx || Infinity;
            return { w: fpx, h: fpx };
        }.call(this);
    }
});
});