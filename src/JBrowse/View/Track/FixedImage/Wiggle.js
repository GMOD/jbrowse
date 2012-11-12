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
    },

    updateStaticElements: function( coords ) {
        this.inherited( arguments );
        this.updateYScaleFromViewDimensions( coords );
    },

    makeImageLoadHandler: function( img, blockIndex, blockWidth, composeCallback ) {
        return this.inherited( arguments,
                               [ img,
                                 blockIndex,
                                 blockWidth,
                                 dojo.hitch(this, function() {
                                                this.makeWiggleYScale();
                                                if( composeCallback )
                                                    composeCallback();
                                            })
                               ]
                             );
    },

    makeWiggleYScale: function() {
        var thisB = this;
        this.store.getGlobalStats( function( stats ) {
            if( ! this.yscale )
                thisB.makeYScale({ min: stats.scoreMin, max: stats.scoreMax });
        });
    }
});

/**
 * Mixin: JBrowse.View.Track.YScaleMixin.
 */
declare.safeMixin( Wiggle.prototype, YScaleMixin );

return Wiggle;
});