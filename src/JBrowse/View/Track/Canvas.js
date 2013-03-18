define( ['dojo/_base/declare',
         'JBrowse/View/Track/BlockBased'
        ],
        function( declare,  BlockBased ) {
return declare( BlockBased,
/**
 * @lends JBrowse.View.Track.Canvas.prototype
 */
{
    /**
     * Base class for canvas-based JBrowse tracks.
     * @constructs
     */
    constructor: function( args ) {
        this.trackPadding = args.trackPadding || 0;

        if( ! ('style' in this.config ) ) {
            this.config.style = {};
        }
    },

    browserHasCanvas: function( blockIndex, block ) {
        try {
            document.createElement('canvas').getContext('2d').fillStyle = 'red';
            return true;
        } catch( e ) {
            return false;
        }
    },

    fillBlock: function( args ) {
        var blockIndex = args.blockIndex;
        var block = args.block;
        var leftBase = args.leftBase;
        var rightBase = args.rightBase;
        var scale = args.scale;

        if( ! this.browserHasCanvas( blockIndex, block ) ) {
            this.fatalError = 'This browser does not support HTML canvas elements.';
            this.fillBlockError( blockIndex, block, this.fatalError );
            return;
        }

        var blockWidth = rightBase - leftBase;
        this.heightUpdate( this.height, blockIndex );
        this.renderCanvases( scale, leftBase, rightBase, dojo.hitch(this, 'layoutCanvases', args ) );
    },

    layoutCanvases: function( /**Object*/ args, /**Array[canvas]*/ canvases ) {
        var block = args.block;
        var leftBase = args.leftBase;
        var rightBase = args.rightBase;

        dojo.forEach( canvases, function(c) {
                          this.heightUpdate( c.height, blockIndex );
                          c.className = 'canvas-track';
                          if (!(c.parentNode && c.parentNode.parentNode)) {
                              c.style.position = "absolute";
                              c.style.left = (100 * ((c.startBase - leftBase) / blockWidth)) + "%";
                              switch (this.config.align) {
                              case "top":
                                  c.style.top = "0px";
                                  break;
                              case "bottom":
                              default:
                                  c.style.bottom = this.trackPadding + "px";
                                  break;
                              }
                              block.appendChild(c);
                          }
                      }, this);
    },

    startZoom: function(destScale, destStart, destEnd) {
        if (this.empty) return;
        this.preRenderCanvases( destScale, destStart, destEnd );
    },

    preRenderCanvases: function( scale, start, end ) {
    },

    endZoom: function(destScale, destBlockBases) {
        this.clear();
    },

    clear: function() {
        this.inherited( arguments );
    },

    transfer: function(sourceBlock, destBlock, scale,
                       containerStart, containerEnd) {
        if (!(sourceBlock && destBlock)) return;

        var children = sourceBlock.childNodes;
        var destLeft = destBlock.startBase;
        var destRight = destBlock.endBase;
        var c;
        for (var i = 0; i < children.length; i++) {
	    c = children[i];
	    if ("startBase" in c) {
	        //if sourceBlock contains a canvas that overlaps destBlock,
	        if ((c.startBase < destRight)
		    && ((c.startBase + c.baseWidth) > destLeft)) {
		    //move canvas from sourceBlock to destBlock
		    c.style.left = (100 * ((c.startBase - destLeft) / (destRight - destLeft))) + "%";
		    destBlock.appendChild(c);
	        }
	    }
        }
    }
});
});
