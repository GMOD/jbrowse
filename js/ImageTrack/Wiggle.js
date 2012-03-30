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
    this.makeYScale();
};

ImageTrack.Wiggle.prototype.heightUpdate = function() {
    ImageTrack.prototype.heightUpdate.apply(this,arguments);
    if( this.yscale )
        this.yscale.style.height = this.height+"px";
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
    var maindiv = document.createElement('div');
    this.yscale = maindiv;
    maindiv.className = 'verticalRuler';
    dojo.style( maindiv, {
        height: this.height+'px',
        position: 'absolute',
        top: '0px',
        background: "#ccc",
        'z-index': 15,
        left: this.yscale_left,
        width: '20px'
    });

    this._renderScale( maindiv );

    this.div.appendChild( maindiv );
};

ImageTrack.Wiggle.prototype._renderScale = function( div ) {
    var ruler = new Ruler({
        min: this.min,
        max: this.max,
        direction: 'up'
    });
    ruler.render_to(div);
};
