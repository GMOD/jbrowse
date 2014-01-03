define( [
          'dojo/_base/declare',
          'JBrowse/has!dom?dojo/dom-construct',

           'JBrowse/has!dom?JBrowse/View/Ruler'
        ],
        function(
            declare,
            dom,

            Ruler
        ) {
/**
 * Mixin for a track that has a Y-axis scale bar on its left side.
 * Puts the scale div in <code>this.yscale</code>, stores the 'left' CSS pixel
 * offset in <code>this.yscale_left</code>.
 * @lends JBrowse.View.Track.YScaleMixin
 */

return declare( null, {

    configSchema: {
        slots: [
            { name: 'yScalePosition', type: 'string', defaultValue: 'center',
              description: 'position at which to draw the Y-axis scale.  Either "left", "right", or "center".'
            }
        ]
    },

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
            dom.create('div', {
                            className: 'ruler vertical_ruler',
                            style: {
                                position: 'absolute',
                                width: '26px',
                                height: this.h+'px',
                                zIndex: 17
                            }
                        }, this.get('widget').domNode );
        this.yscale = rulerdiv;

        this._setScaleLeft();

        rulerdiv.style.top = 0;

        // now make a Ruler and draw the axis in the div we just made
        var ruler = new Ruler({
            min: min,
            max: max,
            direction: 'up',
            leftBottom: this.getConf('yScalePosition') != 'left',
            fixBounds: args.fixBounds || false
        });
        ruler.render_to(
            dom.create( 'div',
                        { style: {
                              height: '100%',
                              width: '10px',
                              position: 'absolute',
                              left: '100%'
                          }
                        },
                        rulerdiv )
        );

        this.ruler = ruler;
    },

    _setScaleLeft: function() {
        if( this.yscale ) {
            var ypos = this.getConf('yScalePosition');
            if( ypos == 'right' )
                this.yscale.style.right = 0;
            else if( ypos == 'left' )
                this.yscale.style.left = 0;
            else
                this.yscale.style.left = '50%';
        }
    },

    updateYScaleFromViewDimensions: function( coords ) {
        if( typeof coords.x == 'number' || typeof coords.width == 'number' ) {
            this._setScaleLeft();
        }
    }
});
});
