define( [
          'dojo/_base/declare',
          'dojo/dom-construct',
        ],
function( declare, dom ) {

return declare( null, {

    constructor: function() {
        this.legend = dom.create( 'div', { className: 'legend' } );
    },

    show: function( config ) {
        var values = config.valuesToPlot;
        var colors = [];
        for ( var key in values ) {
            if (values.hasOwnProperty(key)) {
                colors.push( [ values[key],
                               config.style[ values[key] ] ] );
            }
        }

        var fontHeight = 12;
        var padding = 4;
        var height = colors.length*( fontHeight + padding ) + 2*padding;
        var longestName = colors.map(function(a){return a[0]})
                                .sort(function (a, b) { return b.length - a.length; })[0];
        var width = longestName.length*fontHeight*(2/3) /* <- estimate string width */ + 2*padding+fontHeight;

        var c = dom.create( 'canvas', { height: height, width: width } );
        var context = c.getContext('2d');
        // make frame for legend
        context.fillStyle = 'rgba(255,255,255,0.8)';
        context.strokeStyle = '#666';
        context.fillRect(0,0,width,height);
        context.strokeRect(0,0,width,height);
        // add legend content
        context.font = fontHeight+'px sans-serif';
        var positionCounter = fontHeight+padding;
        for ( var key in colors ) {
            if ( colors.hasOwnProperty(key) ) {
                // write the legend text.
                context.fillStyle = 'black';
                context.fillText(colors[key][0], 2*padding+fontHeight, positionCounter);
                context.beginPath();
                context.fillStyle = colors[key][1];
                context.arc(padding+fontHeight/2, positionCounter-fontHeight/3, fontHeight/3, 0 , 2 * Math.PI, false);
                context.fill();
                positionCounter += fontHeight+padding;
            }
        }
        this.legend.appendChild(c);
        return(this.legend);
    }
});
});