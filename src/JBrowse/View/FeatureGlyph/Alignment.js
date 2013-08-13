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
        if( ! this.getConf('showMismatches') )
            this._drawMismatches = function() {};

    },

    _configSchemaDefinition: function() {
        var def = this.inherited( arguments );
        def.slots.push.apply(
            def.slots,
            [
                { name: 'color', type: 'Color', defaultValue: function( feature, path, glyph, track ) {
                      var missing_mate = feature.get('multi_segment_template') && !feature.get('multi_segment_all_aligned');
                      var strand = feature.get('strand');
                      return                  missing_mate ? glyph.getStyle( feature, 'color_missing_mate' ) :
                          strand == 1  || strand == '+' ? glyph.getStyle( feature, 'color_fwd_strand' )   :
                          strand == -1 || strand == '-' ? glyph.getStyle( feature, 'color_rev_strand' )   :
                          track.colorForBase('reference');
                  }
                },
                { name: 'color_fwd_strand', type: 'Color', defaultValue: '#EC8B8B' },
                { name: 'color_rev_strand', type: 'Color', defaultValue: '#898FD8' },
                { name: 'color_missing_mate', type: 'Color', defaultValue: '#D11919' },
                { name: 'border_color', type: 'Color' },
                { name: 'strandArrow', defaultValue: false },
                { name: 'height', defaultValue: 7 },
                { name: 'marginBottom', defaultValue: 1 },
                { name: 'showMismatches', defaultValue: true, type: 'boolean' },
                { name: 'mismatchFont', type: 'string', defaultValue: 'bold 10px Courier New,monospace' }
            ]);
        return def;
    },

    renderFeature: function( context, fRect ) {

        this.inherited( arguments );

        if( fRect.viewInfo.scale > 0.2 )
            this._drawMismatches( context, fRect );
    },

    _drawMismatches: function( context, fRect ) {
        if ( fRect.w > 1 ) {

            var feature = fRect.f;
            var block = fRect.viewInfo.block;
            var scale = block.scale;

            var mismatches = this._getMismatches( feature );
            var charSize = this.getCharacterMeasurements( context );
            array.forEach( mismatches, function( mismatch ) {
                var start = feature.get('start') + mismatch.start;
                var end = start + mismatch.length;

                var mRect = {
                    h: (fRect.rect||{}).h || fRect.h,
                    l: block.bpToX( start ),
                    t: fRect.rect.t
                };
                mRect.w = Math.max( block.bpToX( end ) - mRect.l, 1 );

                if( mismatch.type == 'mismatch' || mismatch.type == 'deletion' ) {
                    context.fillStyle = this.track.colorForBase( mismatch.type == 'deletion' ? 'deletion' : mismatch.base );
                    context.fillRect( mRect.l, mRect.t, mRect.w, mRect.h );

                    if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                        context.font = this.getConf( 'mismatchFont' );
                        context.fillStyle = mismatch.type == 'deletion' ? 'white' : 'black';
                        context.textBaseline = 'middle';
                        context.fillText( mismatch.base, mRect.l+(mRect.w-charSize.w)/2+1, mRect.t+mRect.h/2 );
                    }
                }
                else if( mismatch.type == 'insertion' ) {
                    context.fillStyle = 'purple';
                    context.fillRect( mRect.l-1, mRect.t+1, 2, mRect.h-2 );
                    context.fillRect( mRect.l-2, mRect.t, 4, 1 );
                    context.fillRect( mRect.l-2, mRect.t+mRect.h-1, 4, 1 );
                    if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                        context.font = this.getConf( 'mismatchFont' );
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
                fpx = (this.getConf('mismatchFont').match(/(\d+)px/i)||[])[1];
            } catch(e) {}

            fpx = fpx || Infinity;
            return { w: fpx, h: fpx };
        }.call(this);
    }

});
});