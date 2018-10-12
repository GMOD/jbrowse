define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'JBrowse/View/FeatureGlyph/Segments'
],
function(
    declare,
    array,
    lang,
    FeatureGlyph
) {
    return declare(FeatureGlyph, {


        //same as parent but without clearRect
        renderFeature: function( context, fRect ) {
            this.renderConnector( context,  fRect );
            this.renderSegments( context, fRect );
            this.renderLabel( context, fRect );
            this.renderDescription( context, fRect );
            this.renderArrowhead( context, fRect );
        },

        layoutFeature: function(viewArgs, layout, feature) {
            var rect = this.inherited(arguments);
            if (!rect) {
                return rect;
            }
            var t = Math.abs(feature.get('insert_size'))

            // need to set the top of the inner rect
            rect.rect.t = t / (this.config.scaleFactor||1);
            rect.t = t / (this.config.scaleFactor||1);

            return rect;
        }
    });
});

