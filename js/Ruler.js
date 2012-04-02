/**
 * Ruler, with ticks and numbers, drawn with HTML elements. Can be
 * stretched to any length.
 *
 * @class
 * @constructor
 *
 * @param {Number} args.min
 * @param {Number} args.max
 * @param {String} [args.direction="up"] The direction of increasing numbers.
 *   Either "up" or "down".
 *
 */

function Ruler(args) {
    dojo.mixin( this, args );
};

Ruler.prototype.render_to = function( target_div ) {
    if( typeof target_div == 'string' )
        target_div = dojo.byId( target_div );

    var target_dims = dojo.coords( target_div );

    //target_div.style.overflow = "hidden";
    var container = document.createElement('div');
    // make an inner container that's styled to compensate for the
    // 12px edge-padding that dojox.charting has builtin that we can't
    // change, making the tick marks align correctly with the images
    var label_digits = Math.floor( Math.log(this.max+1)/Math.log(10))+1;


    dojo.style(container,{
                   position: 'absolute',
                   left: "-9px",
                   bottom: "-13px",
                   width: (40+4*label_digits)+"px",
                   height: (target_dims.h+26)+"px"
               });
    target_div.appendChild(container);

    try {
        dojo.require('dojox.charting.Chart2D');
        var chart1 = new dojox.charting.Chart2D( container, {fill: 'transparent'} );
        chart1.addAxis( "y", {
                            vertical: true,
                            fill: 'transparent',
                            min: this.min,
                            max: this.max
                            // minorTickStep: 0.5,
                            // majorTickStep: 1
                            //labels: [{value: 1, text: "One"}, {value: 3, text: "Ten"}]
                        });
        chart1.addPlot("default", {type: "Bubble", fill: 'transparent'});
        chart1.render();

        // hack to remove a undesirable opaque white rectangle i can't
        // coax dojox.charting to leave out
        var undesirable_rect = container.childNodes[0].childNodes[1];
        if( undesirable_rect )
            undesirable_rect.setAttribute('fill-opacity',0);

    } catch (x) {
        console.error(x+'');
        console.error("Failed to draw Ruler with SVG, your browser may not support the necessary technology.");
        target_div.removeChild( container );
    }

};