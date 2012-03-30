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
    dojo.mixin(this,args);
};

Ruler.prototype.render_to = function( target_div ) {
    if( typeof target_div == 'string' )
        target_div = dojo.byId( target_div );


    var container = document.createElement('div');
    dojo.style(container, {height: '100%', width: '100%'});
    var section_style = {
        'border-color': 'black',
        'border-width': '1px 0 0 1px',
        'border-style': 'solid',
        'width': '100%',
        'z-index': 1000,
        'margin': 0,
        'padding': 0
    };

    var range = this.max - this.min;
    this.ticks = [ this.min, 3, 6, this.max ];

    var prev = 0;
    var sections = dojo.map( this.ticks, function( tickval ) {
        var proportion = (tickval - prev)/range;
        var sec = document.createElement('div');
        dojo.style( sec, section_style );
        sec.style.height = proportion*100 + "%";
        //sec.innerHTML = tickval;
        prev = tickval;
        return sec;
    }, this );

    dojo.forEach( sections.reverse(), function(s) {
        container.appendChild(s);
    });
    target_div.appendChild(container);
};