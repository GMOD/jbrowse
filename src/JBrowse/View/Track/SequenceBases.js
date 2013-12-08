/**
 * Track view that displays the underlying reference sequence bases.
 */
define( [
            'dojo/_base/declare',

            './BlockBased'
        ],
        function(
            declare,

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

    animatableFill: function() {
        return true;
    },

    _fillBlock: function( block, blockNode, changeInfo ) {
        var scale = block.getProjectionBlock().getScale();

        // if we are zoomed in far enough to draw bases, then draw them
        if( scale < 1/1.3 ) {
            return this._fillBlockWithWorker( block, blockNode, changeInfo );
        }
        // otherwise, just draw something that suggests there are
        // bases there if you zoom in far enough
        else {
            blockNode.innerHTML = '<div class="sequence_blur"><span class="zoom">Zoom in to see sequence</span></div>';
            return blockNode;
        }
    }
});
});
