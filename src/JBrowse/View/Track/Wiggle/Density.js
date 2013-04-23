define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/Color',
            'JBrowse/View/Track/WiggleBase',
            'JBrowse/Util'
        ],
        function( declare, array, Color, WiggleBase, Util ) {

return declare( WiggleBase,

/**
* Wiggle track that shows data with variations in color.
*
* @lends JBrowse.View.Track.Wiggle.Density
* @extends JBrowse.View.Track.WiggleBase
*/

{

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                maxExportSpan: 500000,
                style: {
                    height: 31,
                    pos_color: '#00f',
                    neg_color: '#f00',
                    bg_color: 'rgba(230,230,230,0.6)'
                }
            }
        );
    },

    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, pixels, dataScale ) {
        var thisB = this;
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var normalize = dataScale.normalize;

        var featureColor = typeof this.config.style.color == 'function' ? this.config.style.color :
            (function() { // default color function uses conf variables
                var white = new Color('white');
                var black = new Color('black');
                var disableClipMarkers = thisB.config.disable_clip_markers;
                var normOrigin = normalize( dataScale.origin );
                return function( feature ) {
                    var n = normalize( feature );
                    return ( disableClipMarkers || n <= 1 && n >= 0 )
                               ? Color.blendColors(
                                   new Color( thisB.getConfForFeature('style.bg_color', feature ) ),
                                   new Color( thisB.getConfForFeature( n >= normOrigin ? 'style.pos_color' : 'style.neg_color', feature ) ),
                                   Math.abs(n-normOrigin)
                                 )
                               : new Color( thisB.getConfForFeature('style.clip_marker_color', feature ) ) || ( n > 1 ? white : black );
                };
            })();

        dojo.forEach( pixels, function(p,i) {
            if (p) {
                context.fillStyle = ''+featureColor( p );
                context.fillRect( i, 0, 1, canvasHeight );
            }
        });
    },

   _postDraw: function() {}

});
});