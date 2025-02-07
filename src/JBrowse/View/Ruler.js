define([
  'dojo/query',
  'dojox/charting/Chart',
  'dojox/charting/axis2d/Default',
  'dojox/charting/plot2d/Bubble',
  'dojo/NodeList-dom',
  'dojo/number',
], function (query, Chart) {
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
    dojo.mixin(this, args)
  }

  Ruler.prototype.render_to = function (target_div) {
    if (typeof target_div == 'string') {
      target_div = dojo.byId(target_div)
    }

    var target_dims = dojo.position(target_div)

    // make an inner container that's styled to compensate for the
    // 12px edge-padding that dojox.charting has builtin that we can't
    // change, making the tick marks align correctly with the images
    var label_digits = Math.floor(Math.log(this.max + 1) / Math.log(10)) + 1

    var container = dojo.create(
      'div',
      {
        style: {
          position: 'absolute',
          left: '-9px',
          bottom: '-9px',
          width: '10px',
          height: target_dims.h + 18 + 'px',
        },
      },
      target_div,
    )

    try {
      var chart1 = new Chart(container, { fill: 'transparent' })
      chart1.addAxis('y', {
        vertical: true,
        fill: 'transparent',
        min: this.min,
        max: this.max,
        fixLower: this.fixBounds
          ? typeof this.fixBounds == 'string'
            ? this.fixBounds
            : 'major'
          : 'none',
        fixUpper: this.fixBounds
          ? typeof this.fixBounds == 'string'
            ? this.fixBounds
            : 'major'
          : 'none',
        leftBottom: this.leftBottom,
        // minorTickStep: 0.5,
        // majorTickStep: 1
        //labels: [{value: 1, text: "One"}, {value: 3, text: "Ten"}]
      })
      chart1.addPlot('default', { type: 'Bubble', fill: 'transparent' })
      chart1.render()

      // hack to remove undesirable opaque white rectangles.  do
      // this a little bit later
      query('svg rect', chart1.domNode).orphan()

      this.scaler = chart1.axes.y.scaler
    } catch (x) {
      console.error(x + '')
      console.error(
        'Failed to draw Ruler with SVG, your browser may not support the necessary technology.',
      )
      target_div.removeChild(container)
    }
  }

  return Ruler
})
