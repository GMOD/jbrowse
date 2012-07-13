define( ['dojo/_base/declare',
         'JBrowse/View/Track/Canvas'
        ],
        function( declare,  CanvasTrack ) {
return declare( CanvasTrack,
/**
 * @lends JBrowse.View.Track.Wiggle.prototype
 */
{

    renderCanvases: function( scale, leftBase, rightBase ) {
        var c = dojo.create(
            'canvas',
            { height: 100,
              width: 400,
              innerHTML: 'Canvas-based tracks not supported by this browser'
            }
        );
        if( c.getContext )
            c.getContext('2d').fillText('Hello World', 10,10);
        return [c];
    }
});
});
