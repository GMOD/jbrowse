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

dojo.mixin( ImageTrack.Wiggle.prototype, YScaleMixin );

ImageTrack.Wiggle.prototype.updateStaticElements = function( coords ) {
    ImageTrack.prototype.updateStaticElements.apply( this, arguments );
    if( typeof coords.x == 'number' ) {
        this.yscale_left = coords.x + "px";
        if( this.yscale )
            this.yscale.style.left = this.yscale_left;
    }
};

ImageTrack.Wiggle.prototype.loadSuccess = function() {
    ImageTrack.prototype.loadSuccess.apply( this, arguments );
};

ImageTrack.Wiggle.prototype.makeImageLoadHandler = function( img, blockIndex, blockWidth ) {
    var superclass_handler = ImageTrack.prototype.makeImageLoadHandler.apply( this, arguments );
    return dojo.hitch( this, function() {
        superclass_handler();

        if(! this.yscale )
            this.makeWiggleYScale();
    });
};

ImageTrack.Wiggle.prototype.makeWiggleYScale = function() {
    // if we are not loaded yet, we won't have any metadata, so just return
    try {
        this.min   = this.store.metadata.global_min;
        this.max   = this.store.metadata.global_max;
    } catch (x) {
        return;
    }
    this.makeYScale();
};
