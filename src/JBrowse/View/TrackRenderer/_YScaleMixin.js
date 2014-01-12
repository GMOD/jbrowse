define( [
            'dojo/_base/declare',
            'dojo/dom-construct',

            'JBrowse/has',
            'JBrowse/View/Ruler'
        ],
        function(
            declare,
            dom,

            has,
            Ruler
        ) {
/**
 * Mixin for a track that has a Y-axis scale bar on its left side.
 * Puts the scale div in <code>this.yscale</code>, stores the 'left' CSS pixel
 * offset in <code>this.yscale_left</code>.
 * @lends JBrowse.View.Track.YScaleMixin
 */

return declare( null, {

    startup: function() {
        this.inherited(arguments);

        if( has('dom') ) {
            var y = this.yscale = document.createElement('div');
            y.className = 'ruler vertical-ruler';
            this.get('widget').domNode.appendChild( y );
        }
    },

    configSchema: {
        slots: [
            { name: 'yScalePosition', type: 'string', defaultValue: 'center',
              description: 'position at which to draw the Y-axis scale.  Either "left", "right", or "center".'
            }
        ]
    },

    makeYScale: function( args ) {
        args = args || {};
        var widgetNode = args.domNode;
        var min = typeof args.min == 'number' ? args.min : this.minDisplayed;
        var max = typeof args.max == 'number' ? args.max : this.maxDisplayed;

        dom.empty( this.yscale );

        this._setScaleLeft();

        // now make a Ruler and draw the axis in the div we just made
        var ruler = new Ruler({
            min: min,
            max: max,
            span: args.height,
            direction: 'up',
            leftBottom: this.getConf('yScalePosition') != 'left',
            fixBounds: args.fixBounds || false
        });
        ruler.render_to( this.yscale, args.height );

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
    }
});
});
