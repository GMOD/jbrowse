define( ['JBrowse/View/Ruler'],
        function( Ruler ) {
/**
 * Mixin for a track that has a Y-axis scale bar on its left side.
 * Puts the scale div in <code>this.yscale</code>, stores the 'left' CSS pixel
 * offset in <code>this.yscale_left</code>.
 * @lends JBrowse.View.Track.YScaleMixin
 */

return {
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
                        height: this.height+'px',
                        position: 'absolute',
                        width: "100px",
                        zIndex: 17
                    });

        if( this.window_info && 'x' in this.window_info )
            rulerdiv.style.left = (this.window_info.x + (this.window_info.width||0)/2)+ "px";

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
    },

    updateYScaleFromViewDimensions: function( coords ) {
        if( typeof coords.x == 'number' || typeof coords.width == 'number' ) {
            if( this.yscale )
                this.yscale.style.left = (this.window_info.x + (this.window_info.width||0)/2) + "px";
        }
    }
};
});
