define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/View/FeatureGlyph/Box',
           'JBrowse/Store/SeqFeature/_MismatchesMixin'
       ],
       function(
           declare,
           array,
           BoxGlyph,
           MismatchesMixin
       ) {

return declare( [BoxGlyph,MismatchesMixin], {

    constructor: function() {

        // if showMismatches is false, stub out this object's
        // _drawMismatches to be a no-op
        if( ! this.config.style.showMismatches )
            this._drawMismatches = function() {};

    },

    _defaultConfig: function() {
        return this._mergeConfigs(
            dojo.clone( this.inherited(arguments) ),
            {
                //maxFeatureScreenDensity: 400
                style: {
                    color: function( feature, path, glyph, track ) {
                        var missing_mate = feature.get('multi_segment_template') && !feature.get('multi_segment_all_aligned');
                        var strand = feature.get('strand');
                        return                  missing_mate ? glyph.getStyle( feature, 'color_missing_mate' ) :
                               strand == 1  || strand == '+' ? glyph.getStyle( feature, 'color_fwd_strand' )   :
                               strand == -1 || strand == '-' ? glyph.getStyle( feature, 'color_rev_strand' )   :
                                                               track.colorForBase('reference');
                    },
                    color_fwd_strand: '#EC8B8B',
                    color_rev_strand: '#898FD8',
                    color_missing_mate: '#D11919',
                    border_color: null,

                    strandArrow: false,

                    height: 7,
                    marginBottom: 1,
                    showMismatches: true,
                    mismatchFont: 'bold 10px Courier New,monospace'
                }
            }
        );
    },

    renderFeature: function( context, fRect ) {

        this.inherited( arguments );

        if( fRect.viewInfo.scale > 0.2 )
            this._drawMismatches( context, fRect );
    },

    _drawMismatches: function( context, fRect ) {
        var feature = fRect.f;
        var block = fRect.viewInfo.block;
        var scale = block.scale;
        // recall: scale is pixels/basepair
        if ( fRect.w > 1 ) {
            var mismatches = this._getMismatches( feature );
            var charSize = this.getCharacterMeasurements( context );
            array.forEach( mismatches, function( mismatch ) {
                var start = feature.get('start') + mismatch.start;
                var end = start + mismatch.length;

                var mRect = {
                    h: (fRect.rect||{}).h || fRect.h,
                    l: block.bpToX( start ),
                    t: fRect.t
                };
                mRect.w = Math.max( block.bpToX( end ) - mRect.l, 1 );

                if( mismatch.type == 'mismatch' || mismatch.type == 'deletion' ) {
                    context.fillStyle = this.track.colorForBase( mismatch.type == 'deletion' ? 'deletion' : mismatch.base );
                    context.fillRect( mRect.l, mRect.t, mRect.w, mRect.h );

                    if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                        context.font = this.config.style.mismatchFont;
                        context.fillStyle = mismatch.type == 'deletion' ? 'white' : 'black';
                        context.fillText( mismatch.base, mRect.l+(mRect.w-charSize.w)/2+1, mRect.t+mRect.h-(mRect.h-charSize.h+4)/2 );
                    }
                }
                else if( mismatch.type == 'insertion' ) {
                    context.fillStyle = 'purple';
                    context.fillRect( mRect.l-1, mRect.t+1, 2, mRect.h-2 );
                    context.fillRect( mRect.l-2, mRect.t, 4, 1 );
                    context.fillRect( mRect.l-2, mRect.t+mRect.h-1, 4, 1 );
                    if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                        context.font = this.config.style.mismatchFont;
                        context.fillText( '('+mismatch.base+')', mRect.l+2, mRect.t+mRect.h-(mRect.h-charSize.h+4)/2 );
                    }
                }
                else if( mismatch.type == 'skip' ) {
                    context.clearRect( mRect.l, mRect.t, mRect.w, mRect.h );
                    context.fillStyle = '#333';
                    context.fillRect( mRect.l, mRect.t+(mRect.h-2)/2, mRect.w, 2 );
                }
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