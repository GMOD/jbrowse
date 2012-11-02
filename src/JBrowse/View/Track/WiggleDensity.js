define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/Color',
            'JBrowse/View/Track/Wiggle',
            'JBrowse/Util'
        ],
        function( declare, array, Color, Wiggle, Util ) {
return declare( Wiggle, {

    _defaultConfig: function() {
        return { maxExportSpan: 500000, style: { height: 30 } };
    },

    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, features, featureRects ) {

        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var normalize = this.scale.normalize;

        var featureColor = typeof this.config.style.color == 'function' ? this.config.style.color :
            function() {
                var posColor  = new Color( this.config.style.pos_color || '#00f' );
                var negColor  = new Color( this.config.style.neg_color || '#f00' );
                var backgroundColor = new Color( this.config.style.background_color || '#fcfcfc' );
                var clipColor = new Color( this.config.style.clip_marker_color );
                var disableClipMarkers = this.config.disable_clip_markers;
                return function( feature ) {
                    var score = feature.get('score');
                    return Color.blendColors( backgroundColor, posColor, normalize( score ) );
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