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
var fontMeasurementsCache = {};

return declare( FeatureDescriptionMixin,  {

    /**
     * Estimate the height and width, in pixels, of the given
     * feature's label text, and trim it if necessary to fit within
     * the track's maxFeatureGlyphExpansion limit.
     */
    makeFeatureLabel: function( feature, fRect ) {
        var text = this.getFeatureLabel( feature );
        if( ! text )
            return null;
        var l = this.makeBottomOrTopLabel( text, this.getStyle( feature, 'textFont' ), fRect );
        l.fill = this.getStyle( feature, 'textColor' );
        return l;
    },

    /**
     * Estimate the height and width, in pixels, of the given
     * feature's description text, and trim it if necessary to fit
     * within the track's maxFeatureGlyphExpansion limit.
     */
    makeFeatureDescriptionLabel: function( feature, fRect ) {
        var text = this.getFeatureDescription( feature );
        if( ! text )
            return null;
        var l = this.makeBottomOrTopLabel( text, this.getStyle( feature, 'text2Font' ), fRect );
        l.fill = this.getStyle( feature, 'text2Color' );
        return l;
    },

    /**
     * Makes a label that sits on the left or right side of a feature,
     * respecting maxFeatureGlyphExpansion.
     */
    makeSideLabel: function( text, font, fRect ) {
        if( ! text ) return null;

        var dims = this.measureFont( font );
        var excessCharacters = Math.round(( text.length * dims.w - this.track.getConf('maxFeatureGlyphExpansion') ) / dims.w );
        if( excessCharacters > 0 )
            text = text.slice( 0, text.length - excessCharacters - 1 ) + '…';

        return {
            text: text,
            font: font,
            baseline: 'middle',
            w: dims.w * text.length,
            h: dims.h
        };
    },

    /**
     * Makes a label that lays across the bottom edge of a feature,
     * respecting maxFeatureGlyphExpansion.
     */
    makeBottomOrTopLabel: function( text, font, fRect ) {
        if( ! text ) return null;

        var dims = this.measureFont( font );
        var excessCharacters = Math.round(( text.length * dims.w - fRect.w - this.track.getConf('maxFeatureGlyphExpansion') ) / dims.w );
        if( excessCharacters > 0 )
            text = text.slice( 0, text.length - excessCharacters - 1 ) + '…';

        return {
            text: text,
            font: font,
            baseline: 'bottom',
            w: dims.w * text.length,
            h: dims.h
        };
   },

    /**
     * Return an object with average `h` and `w` of characters in the
     * font described by the given string.
     */
    measureFont: function( font ) {
        return fontMeasurementsCache[ font ]
            || ( fontMeasurementsCache[font] = function() {
                     var ctx = document.createElement('canvas').getContext('2d');
                     ctx.font = font;
                     var testString = "MMMMMMMMMMMMXXXXXXXXXX1234567890-.CGCC12345";
                     var m = ctx.measureText( testString );
                     return {
                         h: m.height || parseInt( font.match(/(\d+)px/)[1] ),
                         w: m.width / testString.length
                     };
                 }.call( this ));
    }
});
});
