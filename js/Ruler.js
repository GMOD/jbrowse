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

    var dims = dojo.coords( target_div );

    //target_div.style.overflow = "hidden";
    var container = document.createElement('div');
    dojo.style(container,{ position: 'absolute', bottom: "-12px", width: dims.w+"px", height: (dims.h+26)+"px"});
    target_div.appendChild(container);

    dojo.require('dojox.charting.Chart2D');
    var chart1 = new dojox.charting.Chart2D( container );
//    chart1.addAxis("x", {fixLower: "major", fixUpper: "major", includeZero: true});
    chart1.addAxis( "y", {
                        vertical: true,
                        min: 0,
                        max: this.max
                        // minorTickStep: 0.5,
                        // majorTickStep: 1
                        //labels: [{value: 1, text: "One"}, {value: 3, text: "Ten"}]
                    });
    chart1.addPlot("default", {type: "Default"});
//    chart1.addSeries("Series A", [1, 2, 3, 4, 5], {stroke: {color: "red"}, fill: "lightpink"});
    // chart1.addSeries("Series B", [5, 4, 3, 2, 1], {stroke: {color: "blue"}, fill: "lightblue"});
    chart1.render();
};