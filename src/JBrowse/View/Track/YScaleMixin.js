define( [
          'dojo/_base/declare',
           'JBrowse/View/Ruler'
        ],
        function(
            declare,
            Ruler
        ) {
/**
 * Mixin for a track that has a Y-axis scale bar on its left side.
 * Puts the scale div in <code>this.yscale</code>, stores the 'left' CSS pixel
 * offset in <code>this.yscale_left</code>.
 * @lends JBrowse.View.Track.YScaleMixin
 */

return declare( null, {
    /**
     * @param {Number} [min] Optional minimum value for the scale.
     * Defaults to value of <code>this.minDisplayed</code>.
     * @param {Number} [max] Optional maximum value for the scale.
     * Defaults to value of <code>this.maxDisplayed</code>.
     */
    makeYScale: function( args ) {
        args = args || {};
        var min = typeof args.min == 'number' ? args.min : this.minDisplayed;
        var max = typeof args.max == 'number' ? args.max : this.maxDisplayed;

        // make and style the main container div for the axis
        if( this.yscale ) {
            this.yscale.parentNode.removeChild( this.yscale );
        }
        var rulerdiv =
            dojo.create('div', {
                            className: 'ruler vertical_ruler',
                            style: {
                                height: this.height+'px',
                                width: '10px',
                                position: 'absolute',
                                zIndex: 17
                            }
                        }, this.div );
        this.yscale = rulerdiv;

        if( this.window_info && 'x' in this.window_info ) {
            if ('yscale_position' in this.config) {
                if(this.config.yscale_position == 'right') {
                    this.yscale.style.left = (this.window_info.x + (this.window_info.width-1||0)) + "px";
                }
                else if(this.config.yscale_position == 'left') {
                    this.yscale.style.left = this.window_info.x + 10 + 1 + "px";
                }
                else if(this.config.yscale_position == 'center') {
                    this.yscale.style.left = (this.window_info.x + (this.window_info.width||0)/2) + "px";
                }
            }
            else {
                this.yscale.style.left = (this.window_info.x + (this.window_info.width||0)/2) + "px";
            }
        }

        dojo.style(
            rulerdiv,
            ( this.config.align == 'top' ? { bottom: 0 } :
              { top: 0 })
        );

        // now make a Ruler and draw the axis in the div we just made
        var ruler = new Ruler({
            min: min,
            max: max,
            direction: 'up',
            leftBottom: !('yscale_position' in this.config && this.config.yscale_position == 'left'),
            fixBounds: args.fixBounds || false
        });
        ruler.render_to( rulerdiv );

        this.ruler = ruler;
    },

    updateYScaleFromViewDimensions: function( coords ) {
        if( typeof coords.x == 'number' || typeof coords.width == 'number' ) {
            if( this.yscale ) {
                if ('yscale_position' in this.config) {
                    if(this.config.yscale_position == 'right') {
                        this.yscale.style.left = (this.window_info.x + (this.window_info.width-1||0)) + "px";
                    }
                    else if(this.config.yscale_position == 'left') {
                        this.yscale.style.left = this.window_info.x + 10 + "px";
                    }
                    else if(this.config.yscale_position == 'center') {
                        this.yscale.style.left = (this.window_info.x + (this.window_info.width||0)/2) + "px";
                    }
                }
                else {
                    this.yscale.style.left = (this.window_info.x + (this.window_info.width||0)/2) + "px";
                }
            }
        }
    }
});
});
