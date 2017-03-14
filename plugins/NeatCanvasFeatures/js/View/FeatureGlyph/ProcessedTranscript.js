define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojox/color/Palette',
    'JBrowse/View/FeatureGlyph/ProcessedTranscript',
    './Segments'
],
function (
    declare,
    array,
    Palette,
    ProcessedTranscript,
    Segments
) {
    return declare([ProcessedTranscript, Segments], {

        _getFeatureHeight: function( viewInfo, feature ) {
            var h = this.getStyle( feature, 'height');

            if( viewInfo.displayMode == 'compact' )
                h = Math.round( 0.45 * h );

            if( this.getStyle( feature, 'strandArrow' ) ) {
                var strand = feature.get('strand');
                if( strand == 1 )
                    h = Math.max( this._embeddedImages.plusArrow.height, h );
                else if( strand == -1 )
                    h = Math.max( this._embeddedImages.minusArrow.height, h );
            }

            return h;
        }
    });
});
