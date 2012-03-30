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
            this.makeYScale();
    });
};

ImageTrack.Wiggle.prototype.makeYScale = function() {
    // if we are not loaded yet, we won't have any metadata, so just return
    try {
        this.min   = this.store.metadata.global_min;
        this.max   = this.store.metadata.global_max;
        this.ticks = this.config.tick_marks;
    } catch (x) {
        return;
    }

    // make and style the main container div for the axis
    var rulerdiv = document.createElement('div');
    this.yscale = rulerdiv;
    rulerdiv.className = 'ruler vertical_ruler';
    dojo.style( rulerdiv, {
        height: this.imageHeight+'px',
        position: 'absolute',
        left: this.yscale_left,
        width: '30px',
        zIndex: 17
    });
    dojo.style(
       rulerdiv,
       ( this.config.align == 'top' ? { top: '0px' } :
                                      { bottom: this.trackPadding+"px"})
    );
    this.div.appendChild( rulerdiv );

    // now make a Ruler and draw the axis in the div we just made
    this._renderScale( rulerdiv );
};

ImageTrack.Wiggle.prototype._renderScale = function( div ) {
    var ruler = new Ruler({
        min: this.min,
        max: this.max,
        direction: 'up'
    });
    ruler.render_to(div);
};
