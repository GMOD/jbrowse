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
                    bg_color: 'rgba(230,230,230,0.6)',
                    clip_marker_color: 'black'
                }
            }
        );
    },

    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale ) {
        var thisB = this;
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var normalize = dataScale.normalize;

        var featureColor = typeof this.config.style.color == 'function' ? this.config.style.color :
            (function() { // default color function uses conf variables
                var disableClipMarkers = thisB.config.disable_clip_markers;
                var normOrigin = normalize( dataScale.origin );
                return function( feature, score, n ) {
                    return ( disableClipMarkers || n <= 1 && n >= 0 )
                               // not clipped
                               ? Color.blendColors(
                                   new Color( thisB.getConfForFeature('style.bg_color', feature ) ),
                                   new Color( thisB.getConfForFeature( n >= normOrigin ? 'style.pos_color' : 'style.neg_color', feature ) ),
                                   Math.abs(n-normOrigin)
                                 ).toString()
                               // clipped
                               : ( n > 1 ? thisB.getConfForFeature( 'style.pos_color', feature )
                                         : thisB.getConfForFeature( 'style.neg_color', feature ) );

                };
            })();

        dojo.forEach( features, function(f,i) {
            var fRect = featureRects[i];
            var score = f.get('score');
            var n = normalize( score );
            context.fillStyle = featureColor( f, score, n );
            context.fillRect( fRect.l, 0, fRect.w, canvasHeight );
            if( n > 1 ) { // pos clipped
                context.fillStyle = thisB.getConfForFeature('style.clip_marker_color', f) || 'red';
                context.fillRect( fRect.l, 0, fRect.w, 3 );
            }
            else if( n < 0 ) { // neg clipped
                context.fillStyle = thisB.getConfForFeature('style.clip_marker_color', f) || 'red';
                context.fillRect( fRect.l, canvasHeight-3, fRect.w, 3 );
           }
        });
    },

   _postDraw: function() {}

});
});