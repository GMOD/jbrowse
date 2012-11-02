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
        return { maxExportSpan: 500000, style: { height: 32 } };
    },

    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, features, featureRects ) {

        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var normalize = this.scale.normalize;

        var featureColor = typeof this.config.style.color == 'function' ? this.config.style.color :
            function() { // default color function uses conf variables
                var posColor  = new Color( this.config.style.pos_color || '#00f' );
                var negColor  = new Color( this.config.style.neg_color || '#f00' );
                var white = new Color('white');
                var black = new Color('black');
                var backgroundColor = new Color( this.config.style.background_color || 'rgba(230,230,230,0.6)' );
                var clipColor = new Color( this.config.style.clip_marker_color );
                var disableClipMarkers = this.config.disable_clip_markers;
                var normOrigin = normalize( this.scale.origin );
                return function( feature ) {
                    var score = feature.get('score');
                    var n = normalize( score );
                    return ( disableClipMarkers || n <= 1 && n >= 0 )
                               ? Color.blendColors( backgroundColor, n >= normOrigin ? posColor : negColor, Math.abs(n-normOrigin) )
                               : clipColor || ( n > 1 ? white : black );
                };
            }.call(this);

        dojo.forEach( features, function(f,i) {
            var fRect = featureRects[i];
            context.fillStyle = ''+featureColor( f );
            context.fillRect( fRect.l, 0, fRect.w, canvasHeight );
        });
    },

   _postDraw: function() {}

});
});