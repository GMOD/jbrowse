// VIEW

var ImageTrack;
if( !ImageTrack ) ImageTrack = {};

/**
 * Tiled-image track subclass that displays images calculated from
 * wiggle data.  Has a scale bar in addition to the images.
 * @class
 * @constructor
 */
ImageTrack.Wiggle = function() {
    ImageTrack.apply( this, arguments );
};

ImageTrack.Wiggle.prototype = new ImageTrack({},{},{});

/**
 * Mixin: Track.YScaleMixin.
 */
dojo.mixin( ImageTrack.Wiggle.prototype, Track.YScaleMixin );

ImageTrack.Wiggle.prototype.updateStaticElements = function( coords ) {
    ImageTrack.prototype.updateStaticElements.apply( this, arguments );
    this.updateYScaleFromViewDimensions( coords );
};

ImageTrack.Wiggle.prototype.loadSuccess = function() {
    ImageTrack.prototype.loadSuccess.apply( this, arguments );
};

ImageTrack.Wiggle.prototype.makeImageLoadHandler = function( img, blockIndex, blockWidth, composeCallback ) {
    return ImageTrack.prototype.makeImageLoadHandler.call(
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
};

ImageTrack.Wiggle.prototype.makeWiggleYScale = function() {
    // if we are not loaded yet, we won't have any metadata, so just return
    try {
        this.min   = this.store.stats.global_min;
        this.max   = this.store.stats.global_max;
    } catch (x) {
        return;
    }
    this.makeYScale();
};
