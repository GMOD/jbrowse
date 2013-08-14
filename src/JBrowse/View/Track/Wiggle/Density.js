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

    _configSchemaDefinition: function() {
        var def = this.inherited( arguments );
        def.slots.push.apply( def.slots, [
            { name: 'height', defaultValue: 31 },
            { name: 'posColor', type: 'Color', defaultValue: '#00f' },
            { name: 'negColor', type: 'Color', defaultValue: '#f00' },
            { name: 'backgroundColor',  type: 'Color', defaultValue: 'rgba(230,230,230,0.6)' },
            { name: 'clipMarkerColor', type: 'Color', defaultValue: 'red' },
            { name: 'color', type: 'Color' },
            { name: 'maskColor', type: 'Color', defaultValue: 'rgba(128,128,128,0.6)' },
            { name: 'disableClipMarkers', type: 'boolean', defaultValue: false }
        ]);
        return def;
    },

    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, pixels, dataScale ) {
        var thisB = this;
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var normalize = dataScale.normalize;

        var featureColor = this.confIsSet('color') ? this.getConfFunc('color') :
            (function() { // default color function uses conf variables
                var disableClipMarkers = thisB.getConf('disableClipMarkers');
                var normOrigin = normalize( dataScale.origin );
                return function( pixel ,normScore ) {
                    var feature = pixel.feat;
                    return ( disableClipMarkers || normScore <= 1 && normScore >= 0 )
                               // not clipped
                               ? Color.blendColors(
                                   thisB.getConfForFeature('backgroundColor', feature ),
                                   thisB.getConfForFeature( normScore >= normOrigin ? 'posColor' : 'negColor', feature ),
                                   Math.abs(normScore-normOrigin)
                                 )
                               // clipped
                               : ( normScore > 1 ? thisB.getConfForFeature( 'posColor', feature )
                                                 : thisB.getConfForFeature( 'negColor', feature ) );

                };
            }).call(this);

        dojo.forEach( pixels, function(p,i) {
            if (p) {
                var score = p.score;
                var f = p.feat;

                // draw the bar for the value
                var n = normalize( score );
                context.fillStyle = featureColor( p, n ).toString();
                context.fillRect( i, 0, 1, canvasHeight );

                // draw clip markers if present
                if( n > 1 ) { // pos clipped
                    context.fillStyle = thisB.getConfForFeature('clipMarkerColor', f).toString();
                    context.fillRect( i, 0, 1, 3 );
                }
                else if( n < 0 ) { // neg clipped
                    context.fillStyle = thisB.getConfForFeature('clipMarkerColor', f).toString();
                    context.fillRect( i, canvasHeight-3, 1, 3 );
               }
            }
        });
    },

    /* If boolean track, mask accordingly */
    _maskBySpans: function( scale, leftBase, rightBase, block, canvas, pixels, dataScale, spans ) {
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        context.fillStyle = this.getConf('maskColor').toString();

        for ( var index in spans ) {
            if (spans.hasOwnProperty(index)) {
                var w = Math.ceil(( spans[index].end   - spans[index].start ) * scale );
                var l = Math.round(( spans[index].start - leftBase ) * scale );
                context.fillRect( l, 0, w, canvasHeight );
                context.clearRect( l, 0, w, canvasHeight/3);
                context.clearRect( l, (2/3)*canvasHeight, w, canvasHeight/3);
            }
        }
        dojo.forEach( pixels, function(p,i) {
            if (!p) {
                // if there is no data at a point, erase the mask.
                context.clearRect( i, 0, 1, canvasHeight );
            }
        });
    },

   _postDraw: function() {}

});
});