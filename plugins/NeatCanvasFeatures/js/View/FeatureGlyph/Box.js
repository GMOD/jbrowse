define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'JBrowse/View/FeatureGlyph/Box',
], function (declare, lang, domConstruct, Box) {
  return declare(Box, {
    renderBox: function (
      context,
      viewInfo,
      feature,
      top,
      overallHeight,
      parentFeature,
      style,
    ) {
      var left = viewInfo.block.bpToX(feature.get('start'))
      var width = viewInfo.block.bpToX(feature.get('end')) - left

      style = style || lang.hitch(this, 'getStyle')

      var height = this._getFeatureHeight(viewInfo, feature)
      if (!height) {
        return
      }
      if (height != overallHeight) {
        top += Math.round((overallHeight - height) / 2)
      }

      var bgcolor = style(feature, 'color')
      bgcolor = getColorHex(bgcolor)

      var type = feature.get('type')

      if (typeof type !== 'undefined' && type.indexOf('UTR') > -1) {
        context.fillStyle = '#fdfdfd'
        // this.colorShift(bgcolor,4.5);
      } else {
        if (this.config.gradient) {
          bgcolor = this.colorShift(bgcolor, 0)

          var grd = context.createLinearGradient(left, top, left, top + height)

          // Add colors
          grd.addColorStop(0.0, bgcolor)
          grd.addColorStop(0.5, this.colorShift(bgcolor, 2.5))
          grd.addColorStop(0.999, bgcolor)

          context.fillStyle = grd
        } else {
          context.fillStyle = bgcolor
        }
      }

      if (bgcolor) {
        context.fillRect(left, top, Math.max(1, width), height)
      } else {
        context.clearRect(left, top, Math.max(1, width), height)
      }

      var borderColor, lineWidth
      if (typeof type !== 'undefined' && type.indexOf('UTR') > -1) {
        lineWidth = 1
        borderColor = '#b0b0b0'
        if (width > 3) {
          context.lineWidth = lineWidth
          context.strokeStyle = bgcolor // borderColor;
          context.strokeRect(
            left + lineWidth / 2,
            top + lineWidth / 2,
            width - lineWidth,
            height - lineWidth,
          )
        }
      } else if (
        (borderColor = style(feature, 'borderColor')) &&
        (lineWidth = style(feature, 'borderWidth'))
      ) {
        if (width > 3) {
          context.lineWidth = lineWidth
          context.strokeStyle = borderColor

          // need to stroke a smaller rectangle to remain within
          // the bounds of the feature's overall height and
          // width, because of the way stroking is done in
          // canvas.  thus the +0.5 and -1 business.
          context.strokeRect(
            left + lineWidth / 2,
            top + lineWidth / 2,
            width - lineWidth,
            height - lineWidth,
          )
        } else {
          context.globalAlpha = (lineWidth * 2) / width
          context.fillStyle = borderColor
          context.fillRect(left, top, Math.max(1, width), height)
          context.globalAlpha = 1
        }
      }
    },
    /**
     * Given color string in #rrggbb format, shift the color by shift %  ( i.e. .20 is 20% brighter, -.30 is 30% darker.
     * The new string is returned.
     * If color is not in #rrggbb format, just return the original value.
     */
    colorShift: function (color, shift) {
      if (color.substring(0, 1) !== '#' || color.length !== 7) return color

      var rstr = color.substring(1, 3)
      var gstr = color.substring(3, 5)
      var bstr = color.substring(5, 7)

      var r = parseInt(rstr, 16)
      var g = parseInt(gstr, 16)
      var b = parseInt(bstr, 16)
      r += Math.round(r * shift)
      g += Math.round(g * shift)
      b += Math.round(b * shift)

      r = Math.min(255, r)
      g = Math.min(255, g)
      b = Math.min(255, b)

      rstr = this.zeroPad(r)
      gstr = this.zeroPad(g)
      bstr = this.zeroPad(b)

      return '#' + rstr + gstr + bstr
    },

    zeroPad: function (num) {
      var num1 = '00' + num.toString(16)
      var numstr = num1.substr(num1.length - 2)
      return numstr
    },
  })
})

function componentFromStr(numStr, percent) {
  var num = Math.max(0, parseInt(numStr, 10))
  return percent
    ? Math.floor((255 * Math.min(100, num)) / 100)
    : Math.min(255, num)
}

function getColorHex(color) {
  if (color.indexOf('#') > -1) return color
  if (color.indexOf('rgba') > -1) return rgbToHex(color)
  if (color.indexOf('rgb') > -1) return rgbaToHex(color)
  return colourNameToHex(color)
}
function rgbToHex(rgb) {
  if (rgb.indexOf('rgba') > -1) {
    return rgbaToHex(rgb)
  }

  var rgbRegex =
    /^rgb\(\s*(-?\d+)(%?)\s*,\s*(-?\d+)(%?)\s*,\s*(-?\d+)(%?)\s*\)$/
  var result,
    r,
    g,
    b,
    hex = ''
  if ((result = rgbRegex.exec(rgb))) {
    r = componentFromStr(result[1], result[2])
    g = componentFromStr(result[3], result[4])
    b = componentFromStr(result[5], result[6])

    hex = '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)
  }
  return hex
}
function rgbaToHex(rgb) {
  var rgbRegex =
    /^rgba\(\s*(-?\d+)(%?)\s*,\s*(-?\d+)(%?)\s*,\s*(-?\d+)(%?)\s*,\s*(-?\d+)(%?)\s*\)$/
  var result,
    r,
    g,
    b,
    hex = ''
  if ((result = rgbRegex.exec(rgb))) {
    r = componentFromStr(result[1], result[2])
    g = componentFromStr(result[3], result[4])
    b = componentFromStr(result[5], result[6])

    hex = '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)
  }
  return hex
}
function colourNameToHex(colour) {
  var colours = {
    aliceblue: '#f0f8ff',
    antiquewhite: '#faebd7',
    aqua: '#00ffff',
    aquamarine: '#7fffd4',
    azure: '#f0ffff',
    beige: '#f5f5dc',
    bisque: '#ffe4c4',
    black: '#000000',
    blanchedalmond: '#ffebcd',
    blue: '#0000ff',
    blueviolet: '#8a2be2',
    brown: '#a52a2a',
    burlywood: '#deb887',
    cadetblue: '#5f9ea0',
    chartreuse: '#7fff00',
    chocolate: '#d2691e',
    coral: '#ff7f50',
    cornflowerblue: '#6495ed',
    cornsilk: '#fff8dc',
    crimson: '#dc143c',
    cyan: '#00ffff',
    darkblue: '#00008b',
    darkcyan: '#008b8b',
    darkgoldenrod: '#b8860b',
    darkgray: '#a9a9a9',
    darkgreen: '#006400',
    darkkhaki: '#bdb76b',
    darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f',
    darkorange: '#ff8c00',
    darkorchid: '#9932cc',
    darkred: '#8b0000',
    darksalmon: '#e9967a',
    darkseagreen: '#8fbc8f',
    darkslateblue: '#483d8b',
    darkslategray: '#2f4f4f',
    darkturquoise: '#00ced1',
    darkviolet: '#9400d3',
    deeppink: '#ff1493',
    deepskyblue: '#00bfff',
    dimgray: '#696969',
    dodgerblue: '#1e90ff',
    firebrick: '#b22222',
    floralwhite: '#fffaf0',
    forestgreen: '#228b22',
    fuchsia: '#ff00ff',
    gainsboro: '#dcdcdc',
    ghostwhite: '#f8f8ff',
    gold: '#ffd700',
    goldenrod: '#daa520',
    gray: '#808080',
    green: '#008000',
    greenyellow: '#adff2f',
    honeydew: '#f0fff0',
    hotpink: '#ff69b4',
    'indianred ': '#cd5c5c',
    indigo: '#4b0082',
    ivory: '#fffff0',
    khaki: '#f0e68c',
    lavender: '#e6e6fa',
    lavenderblush: '#fff0f5',
    lawngreen: '#7cfc00',
    lemonchiffon: '#fffacd',
    lightblue: '#add8e6',
    lightcoral: '#f08080',
    lightcyan: '#e0ffff',
    lightgoldenrodyellow: '#fafad2',
    lightgrey: '#d3d3d3',
    lightgreen: '#90ee90',
    lightpink: '#ffb6c1',
    lightsalmon: '#ffa07a',
    lightseagreen: '#20b2aa',
    lightskyblue: '#87cefa',
    lightslategray: '#778899',
    lightsteelblue: '#b0c4de',
    lightyellow: '#ffffe0',
    lime: '#00ff00',
    limegreen: '#32cd32',
    linen: '#faf0e6',
    magenta: '#ff00ff',
    maroon: '#800000',
    mediumaquamarine: '#66cdaa',
    mediumblue: '#0000cd',
    mediumorchid: '#ba55d3',
    mediumpurple: '#9370d8',
    mediumseagreen: '#3cb371',
    mediumslateblue: '#7b68ee',
    mediumspringgreen: '#00fa9a',
    mediumturquoise: '#48d1cc',
    mediumvioletred: '#c71585',
    midnightblue: '#191970',
    mintcream: '#f5fffa',
    mistyrose: '#ffe4e1',
    moccasin: '#ffe4b5',
    navajowhite: '#ffdead',
    navy: '#000080',
    oldlace: '#fdf5e6',
    olive: '#808000',
    olivedrab: '#6b8e23',
    orange: '#ffa500',
    orangered: '#ff4500',
    orchid: '#da70d6',
    palegoldenrod: '#eee8aa',
    palegreen: '#98fb98',
    paleturquoise: '#afeeee',
    palevioletred: '#d87093',
    papayawhip: '#ffefd5',
    peachpuff: '#ffdab9',
    peru: '#cd853f',
    pink: '#ffc0cb',
    plum: '#dda0dd',
    powderblue: '#b0e0e6',
    purple: '#800080',
    red: '#ff0000',
    rosybrown: '#bc8f8f',
    royalblue: '#4169e1',
    saddlebrown: '#8b4513',
    salmon: '#fa8072',
    sandybrown: '#f4a460',
    seagreen: '#2e8b57',
    seashell: '#fff5ee',
    sienna: '#a0522d',
    silver: '#c0c0c0',
    skyblue: '#87ceeb',
    slateblue: '#6a5acd',
    slategray: '#708090',
    snow: '#fffafa',
    springgreen: '#00ff7f',
    steelblue: '#4682b4',
    tan: '#d2b48c',
    teal: '#008080',
    thistle: '#d8bfd8',
    tomato: '#ff6347',
    turquoise: '#40e0d0',
    violet: '#ee82ee',
    wheat: '#f5deb3',
    white: '#ffffff',
    whitesmoke: '#f5f5f5',
    yellow: '#ffff00',
    yellowgreen: '#9acd32',
  }

  if (typeof colours[colour.toLowerCase()] !== 'undefined') {
    return colours[colour.toLowerCase()]
  }

  return '#000000'
}
