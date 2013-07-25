define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'JBrowse/View/_FeatureDescriptionMixin'
        ],
        function(
            declare,
            lang,
            FeatureDescriptionMixin
        ) {
return declare( FeatureDescriptionMixin,  {

    /**
     * Estimate the height and width, in pixels, of the given
     * feature's label text, and trim it if necessary to fit within
     * the track's maxFeatureGlyphExpansion limit.
     */
    makeLabel: function( feature, fRect ) {
        var text = this.getFeatureLabel( feature );
        if( ! text )
            return null;
        var dims = this._labelDims
            || ( this._labelDims = this._measureFont( this.config.style.textFont ) );
        return this._trimText( text, dims, fRect );
    },

    /**
     * Estimate the height and width, in pixels, of the given
     * feature's description text, and trim it if necessary to fit
     * within the track's maxFeatureGlyphExpansion limit.
     */
    makeDescription: function( feature, fRect ) {
        var text = this.getFeatureDescription( feature );
        if( ! text )
            return null;
        var dims = this._descDims
            || ( this._descDims = this._measureFont( this.config.style.textFont ) );
        return this._trimText( text, dims, fRect );
    },

    _trimText: function( text, dims, fRect ) {

        var excessCharacters = Math.round(( text.length * dims.w - fRect.w - this.track.config.maxFeatureGlyphExpansion ) / dims.w );
        if( excessCharacters > 0 )
            text = text.slice( 0, text.length - excessCharacters - 1 ) + '…';

        return {
            text: text,
            w: dims.w * text.length,
            h: dims.h
        };
    },

    /**
     * Return an object with average `h` and `w` of characters in the
     * font described by the given string.
     */
    _measureFont: function( font ) {
        var ctx = document.createElement('canvas').getContext('2d');
        ctx.font = font;
        var testString = "AaBbMmNn-..Zz1234567890";
        var m = ctx.measureText( testString );
        return {
            h: m.height || parseInt( font.match(/(\d+)px/)[1] ),
            w: m.width / testString.length
        };
    }
});
});
