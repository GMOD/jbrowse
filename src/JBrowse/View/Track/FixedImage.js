define(
    [
        'dojo/_base/declare',
        'JBrowse/View/Track/BlockBased'
    ],
    function( declare, BlockBased ) {

return declare( BlockBased,
 /**
  * @lends JBrowse.View.Track.FixedImage.prototype
  */
{

    /**
     * A track that displays tiled images (PNGs, or other images) at fixed
     * intervals along the reference sequence.
     * @constructs
     * @extends JBrowse.View.Track.BlockBased
     */
    constructor: function( args ) {
        var config = args.config;
        var refSeq = args.refSeq;

        BlockBased.call(
            this, config.label, config.key,
            false, args.changeCallback);

        if( !refSeq.end )
            return;

        this.refSeq = refSeq;
        this.trackPadding = args.trackPadding || 0;

        this.config = config;

        this.store = args.store;
        dojo.connect( this.store, 'loadSuccess', this, 'loadSuccess' );
        dojo.connect( this.store, 'loadFail',    this, 'loadFail'    );
    },

    /**
     * Request that the track load its data.  The track will call its own
     * loadSuccess() function when it is loaded.
     */
    load: function() {
        this.store.load();
    },

    loadSuccess: function(o,url) {
        this.empty = this.store.empty;
        this.setLoaded();
    },

    setViewInfo: function(heightUpdate, numBlocks,
                                                trackDiv, labelDiv,
                                                widthPct, widthPx, scale) {
        BlockBased.prototype.setViewInfo.apply( this, arguments );
        this.setLabel( this.key );
    },

    handleImageError: function(ev) {
        var img = ev.currentTarget || ev.srcElement;
        img.style.display = "none";
        dojo.stopEvent(ev);
    },

    /**
     * @private
     */
    makeImageLoadHandler: function( img, blockIndex, blockWidth, composeCallback ) {
        var handler = dojo.hitch( this, function() {
                                      this.imageHeight = img.height;
                                      img.style.height = img.height + "px";
                                      img.style.width  = (100 * (img.baseWidth / blockWidth)) + "%";
                                      this.heightUpdate( img.height, blockIndex );
                                      if( composeCallback )
                                          composeCallback();
                                      return true;
                                  });

        if( ! dojo.isIE )
            return handler;
        else
            // in IE, have to delay calling it for a (arbitrary) 1/4
            // second because the image's height is not always
            // available when the onload event fires.  >:-{
            return function() {
                window.setTimeout(handler,250);
            };

    },

    fillBlock: function(blockIndex, block,
                        leftBlock, rightBlock,
                        leftBase, rightBase,
                        scale, stripeWidth,
                        containerStart, containerEnd) {

        var blockWidth = rightBase - leftBase;
        var images = this.store.getImages( scale, leftBase, rightBase );
        var im;

        dojo.forEach( images, function(im) {
                          im.className = 'image-track';
	                  if (!(im.parentNode && im.parentNode.parentNode)) {
                              im.style.position = "absolute";
                              im.style.left = (100 * ((im.startBase - leftBase) / blockWidth)) + "%";
                              switch (this.config.align) {
                              case "top":
                                  im.style.top = "0px";
                                  break;
                              case "bottom":
                              default:
                                  im.style.bottom = this.trackPadding + "px";
                                  break;
                              }
                              block.appendChild(im);
	                  }

                          // make an onload handler for when the image is fetched that
                          // will update the height and width of the track
                          var loadhandler = this.makeImageLoadHandler( im, blockIndex, blockWidth );
                          if( im.complete )
                              // just call the handler ourselves if the image is already loaded
                              loadhandler();
                          else
                              // otherwise schedule it
                              dojo.connect( im, "onload", loadhandler );

                      }, this);
    },

    startZoom: function(destScale, destStart, destEnd) {
        if (this.empty) return;
        this.store.clearCache();
        this.store.getImages( destScale, destStart, destEnd );
    },

    endZoom: function(destScale, destBlockBases) {
        BlockBased.prototype.clear.apply(this);
    },

    clear: function() {
        BlockBased.prototype.clear.apply(this);
        this.store.clearCache();
    },

    transfer: function(sourceBlock, destBlock, scale,
                                             containerStart, containerEnd) {
        if (!(sourceBlock && destBlock)) return;

        var children = sourceBlock.childNodes;
        var destLeft = destBlock.startBase;
        var destRight = destBlock.endBase;
        var im;
        for (var i = 0; i < children.length; i++) {
	    im = children[i];
	    if ("startBase" in im) {
	        //if sourceBlock contains an image that overlaps destBlock,
	        if ((im.startBase < destRight)
		    && ((im.startBase + im.baseWidth) > destLeft)) {
		    //move image from sourceBlock to destBlock
		    im.style.left = (100 * ((im.startBase - destLeft) / (destRight - destLeft))) + "%";
		    destBlock.appendChild(im);
	        } else {
                    // don't move it, and even uncache it
		    this.store.unCacheImage( im );
	        }
	    }
        }
    }
});

});