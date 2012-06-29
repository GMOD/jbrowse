define([
           'dojo/_base/declare',
           'JBrowse/View/Track/FixedImage',
           'JBrowse/View/Track/YScaleMixin'
       ],
       function( declare, FixedImage, YScaleMixin ) {

var Wiggle = declare( FixedImage,
 /**
  * @lends JBrowse.View.Track.FixedImage.Wiggle.prototype
  */
{

    /**
     * Tiled-image track subclass that displays images calculated from
     * wiggle data.  Has a scale bar in addition to the images.
     * @class
     * @constructor
     */
    constructor: function() {
        FixedImage.apply( this, arguments );
    },


    updateStaticElements: function( coords ) {
        FixedImage.prototype.updateStaticElements.apply( this, arguments );
        this.updateYScaleFromViewDimensions( coords );
    },

    loadSuccess: function() {
        FixedImage.prototype.loadSuccess.apply( this, arguments );
    },

    makeImageLoadHandler: function( img, blockIndex, blockWidth, composeCallback ) {
        return FixedImage.prototype.makeImageLoadHandler.call(
            this,
            img,
            blockIndex,
            blockWidth,
            dojo.hitch(this, function() {
                           if(! this.yscale )
                               this.makeWiggleYScale();
                           if( composeCallback )
                               composeCallback();
                       })
        );
    },

    makeWiggleYScale: function() {
        // if we are not loaded yet, we won't have any metadata, so just return
        try {
            this.min   = this.store.stats.global_min;
            this.max   = this.store.stats.global_max;
        } catch (x) {
            return;
        }
        this.makeYScale();
    }
});

/**
 * Mixin: JBrowse.View.Track.YScaleMixin.
 */
declare.safeMixin( Wiggle.prototype, YScaleMixin );

return Wiggle;
});