/**
 * Track view that displays the underlying reference sequence bases.
 */
define( [
            'dojo/_base/declare',
            'dojo/dom-construct',

            './BlockBased'
        ],
        function(
            declare,
            dom,

            BlockBased
        ) {

return declare( BlockBased,
{
    trackCSSClass: 'sequenceBases',

    configSchema: {
        slots: [
            { name: 'renderer', type: 'object', defaultValue: {
                  type: 'JBrowse/View/Track/SequenceBases/Worker'
              }
            }
        ]
    },

    _fillBlock: function( block, blockNode, changeInfo ) {
        var scale = block.getProjectionBlock().getScale();

        // if we are zoomed in far enough to draw bases, then draw them
        if( scale <= 1 ) {
            this.removeTrackMessage();
            return this._fillBlockWithWorker( block, blockNode, changeInfo );
        }
        // otherwise, just draw something that suggests there are
        // bases there if you zoom in far enough
        else {
            dom.empty( blockNode );
            this.showTrackMessage('Zoom in to see sequence');
            this.heightUpdate( 30, block );
            return blockNode;
        }
    }
});
});
