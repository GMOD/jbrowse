/**
 * Mixin for a track that has a Y-axis scale bar on its left side.
 * Puts the scale div in <code>this.yscale</code>, stores the 'left' CSS pixel
 * offset in <code>this.yscale_left</code>.
 * @class
 */

var YScaleMixin = {

    /**
     * @param {Number} [min] Optional minimum value for the scale.
     * Defaults to value of <code>this.min</code>.
     * @param {Number} [max] Optional maximum value for the scale.
     * Defaults to value of <code>this.max</code>.
     */
    makeYScale: function( args ) {
        var min = args && typeof args.min == 'number' ? args.min : this.min;
        var max = args && typeof args.max == 'number' ? args.max : this.max;

        // make and style the main container div for the axis
        var rulerdiv = document.createElement('div');
        this.yscale = rulerdiv;
        rulerdiv.className = 'ruler vertical_ruler';
        dojo.style( rulerdiv, {
                        height: this.imageHeight+'px',
                        position: 'absolute',
                        left: this.yscale_left,
                        width: "100px",
                        zIndex: 17
                    });
        dojo.style(
            rulerdiv,
            ( this.config.align == 'top' ? { top: '0px' } :
              { bottom: this.trackPadding+"px"})
        );
        this.div.appendChild( rulerdiv );

        // now make a Ruler and draw the axis in the div we just made
        var ruler = new Ruler({
            min: min,
            max: max,
            direction: 'up'
        });
        ruler.render_to( rulerdiv );
    }
};
