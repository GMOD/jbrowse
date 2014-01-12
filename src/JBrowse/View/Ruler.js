define( [
            'dojo/dom-construct',

            'dojox/charting/scaler/linear'
        ],
        function(
            dom,
            linearScaler
        ) {
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
 * @param {Boolean} args.leftBottom=true Should the ticks and labels be on the right
 * or the left.
 *
 */

function Ruler(args) {
    dojo.mixin( this, args );
};

Ruler.prototype.render_to = function( target_div, height ) {

    var scaler = linearScaler.buildScaler( this.min, this.max, height, {} );
    this.scaler = scaler;

    var ruler_div = dom.create('div', { className: 'ruler-scale' }, target_div );

    var scale = scaler.bounds.scale;
    var maj_first_y = (scaler.major.start - scaler.bounds.lower)*scale;
    for( var maj_i = 0; maj_i < scaler.major.count; maj_i++ ) {
        var maj_y = maj_first_y + maj_i*scaler.major.tick*scale;
        dom.create( 'div', {
                        className: 'tick-label',
                        style: {
                            bottom: maj_y+'px'
                        },
                        innerHTML: '<div>'+(scaler.major.start+scaler.major.tick*maj_i)+'</div>'
                    }, target_div );
        dom.create( 'div', { className: 'tick major-tick', style: { bottom: maj_y+'px' } }, ruler_div );
        for( var min_i = 1; min_i < scaler.minorPerMajor; min_i++ ) {
            dom.create('div', { className: 'tick minor-tick', style: { bottom: maj_y + min_i*scaler.minor.tick*scale+'px' }}, ruler_div );
        }
    }

    if( scaler.minor.tick )
        for( var min_y = maj_first_y - scaler.minor.tick*scale; min_y > 0; min_y -= scaler.minor.tick*scale ) {
            dom.create('div', { className: 'tick minor-tick', style: { bottom: min_y + 'px' }}, ruler_div );
        }

    //var svg = target_div.createChild( 'svg', { className: 'ruler-scale', width: 20, height: height });
};

return Ruler;
});
