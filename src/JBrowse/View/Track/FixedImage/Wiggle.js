define([
           'dojo/_base/declare',
           'JBrowse/View/Track/FixedImage',
           'JBrowse/View/Track/_YScaleMixin'
       ],
       function( declare, FixedImage, YScaleMixin ) {

var Wiggle = declare( [ FixedImage, YScaleMixin ],
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
            if( ! thisB.yscale )
                thisB.makeYScale({ min: stats.scoreMin, max: stats.scoreMax });
        });
    }
});

return Wiggle;
});