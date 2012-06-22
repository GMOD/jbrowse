dojo.declare('JBrowse.View.Track.FixedImage.Wiggle', JBrowse.View.Track.FixedImage,
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
        JBrowse.View.Track.FixedImage.apply( this, arguments );
    },


    updateStaticElements: function( coords ) {
        JBrowse.View.Track.FixedImage.prototype.updateStaticElements.apply( this, arguments );
        this.updateYScaleFromViewDimensions( coords );
    },

    loadSuccess: function() {
        JBrowse.View.Track.FixedImage.prototype.loadSuccess.apply( this, arguments );
    },

    makeImageLoadHandler: function( img, blockIndex, blockWidth, composeCallback ) {
        return JBrowse.View.Track.FixedImage.prototype.makeImageLoadHandler.call(
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
dojo.extend( JBrowse.View.Track.FixedImage.Wiggle, JBrowse.View.Track.YScaleMixin );
