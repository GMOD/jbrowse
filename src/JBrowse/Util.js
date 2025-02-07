const url = cjsRequire('url')

import dompurify from 'dompurify'

/**
 * Miscellaneous utility functions.
 */
define([
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/Deferred',

  'dojox/lang/functional/object',
  'dojox/lang/functional/fold',
], function (array, lang, Deferred) {
  var Util
  Util = {
    dojof: dojox.lang.functional,
    is_ie: navigator.appVersion.indexOf('MSIE') >= 0,
    is_ie6: navigator.appVersion.indexOf('MSIE 6') >= 0,
    addCommas: function (nStr) {
      nStr += ''
      var x = nStr.split('.')
      var x1 = x[0]
      var x2 = x.length > 1 ? `.${x[1]}` : ''
      var rgx = /(\d+)(\d{3})/
      while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2')
      }
      return x1 + x2
    },

    commifyNumber: function () {
      return this.addCommas.apply(this, arguments)
    },

    escapeHTML: function (str) {
      return dompurify.sanitize(str)
    },

    unescapeHTML: function (str) {
      return str
        .toString()
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
    },

    /**
     * Fast, simple class-maker, used for classes that need speed more
     * than they need dojo.declare's nice features.
     */
    fastDeclare: function (members, className) {
      var constructor = members.constructor
      var fastDeclareClass = function () {
        constructor.apply(this, arguments)
      }
      dojo.mixin(fastDeclareClass.prototype, members)
      return fastDeclareClass
    },

    isRightButton: function (e) {
      if (!e) {
        var e = window.event
      }
      if (e.which) {
        return e.which == 3
      } else if (e.button) {
        return e.button == 2
      } else {
        return false
      }
    },

    getViewportWidth: function () {
      var width = 0
      if (document.documentElement && document.documentElement.clientWidth) {
        width = document.documentElement.clientWidth
      } else if (document.body && document.body.clientWidth) {
        width = document.body.clientWidth
      } else if (window.innerWidth) {
        width = window.innerWidth - 18
      }
      return width
    },

    getViewportHeight: function () {
      var height = 0
      if (document.documentElement && document.documentElement.clientHeight) {
        height = document.documentElement.clientHeight
      } else if (document.body && document.body.clientHeight) {
        height = document.body.clientHeight
      } else if (window.innerHeight) {
        height = window.innerHeight - 18
      }
      return height
    },

    findNearest: function (numArray, num) {
      var minIndex = 0
      var min = Math.abs(num - numArray[0])
      for (var i = 1; i < numArray.length; i++) {
        if (Math.abs(num - numArray[i]) < min) {
          minIndex = i
          min = Math.abs(num - numArray[i])
        }
      }
      return minIndex
    },

    /**
     * replace variables in a template string with values
     * @param template String with variable names in curly brackets
     *                 e.g., "http://foo/{bar}?arg={baz.foo}
     * @param fillWith object with attribute-value mappings
     *                 e.g., { 'bar': 'someurl', 'baz': { 'foo': 42 } }
     * @returns the template string with variables in fillWith replaced
     *                 e.g., 'htp://foo/someurl?arg=valueforbaz'
     *
     */

    fillTemplate: function (template, fillWith) {
      return template.replace(/\{([\w\s\.]+)\}/g, function (match, varname) {
        varname = varname.replace(/\s+/g, '') // remove all whitespace
        var fill = lang.getObject(varname, false, fillWith)
        if (fill !== undefined) {
          if (typeof fill == 'function') {
            return fill(varname)
          } else {
            return fill
          }
        } else if (fillWith.callback) {
          var v = fillWith.callback.call(this, varname)
          if (v !== undefined) {
            return v
          }
        }
        return match
      })
    },

    /**
     * function to load a specified resource only once
     * @param {Object}   dojoXhrArgs object containing arguments for dojo.xhrGet,
     *                               like <code>url</code> and <code>handleAs</code>
     * @param {Object}   stateObj object that stores the state of the load
     * @param {Function} successCallback function to call on a successful load
     * @param {Function} errorCallback function to call on an unsuccessful load
     */
    maybeLoad: function (
      dojoXhrArgs,
      stateObj,
      successCallback,
      errorCallback,
    ) {
      if (stateObj.state) {
        if ('loaded' == stateObj.state) {
          successCallback(stateObj.data)
        } else if ('error' == stateObj.state) {
          errorCallback()
        } else if ('loading' == stateObj.state) {
          stateObj.successCallbacks.push(successCallback)
          if (errorCallback) {
            stateObj.errorCallbacks.push(errorCallback)
          }
        }
      } else {
        stateObj.state = 'loading'
        stateObj.successCallbacks = [successCallback]
        stateObj.errorCallbacks = [errorCallback]

        var args = dojo.clone(dojoXhrArgs)
        args.load = function (o) {
          stateObj.state = 'loaded'
          stateObj.data = o
          var cbs = stateObj.successCallbacks
          for (var c = 0; c < cbs.length; c++) {
            cbs[c](o)
          }
        }
        args.error = function (error) {
          console.error(`${error}`)
          stateObj.state = 'error'
          var cbs = stateObj.errorCallbacks
          for (var c = 0; c < cbs.length; c++) {
            cbs[c]()
          }
        }

        dojo.xhrGet(args)
      }
    },

    /**
     * updates a with values from b, recursively
     */
    deepUpdate: function (a, b) {
      for (var prop in b) {
        if (
          prop in a &&
          'object' == typeof b[prop] &&
          'object' == typeof a[prop]
        ) {
          Util.deepUpdate(a[prop], b[prop])
        } else if (
          typeof a[prop] == 'undefined' ||
          typeof b[prop] != 'undefined'
        ) {
          a[prop] = b[prop]
        }
      }
      return a
    },

    humanReadableNumber: function (num) {
      num = parseInt(num)
      var suffix = ''
      if (num >= 1e12) {
        num /= 1e12
        suffix = 'T'
      } else if (num >= 1e9) {
        num /= 1e9
        suffix = 'G'
      } else if (num >= 1e6) {
        num /= 1e6
        suffix = 'M'
      } else if (num >= 1000) {
        num /= 1000
        suffix = 'K'
      }

      return `${num.toFixed(2)} ${suffix}`
        .replace(/0+ /, ' ')
        .replace(/\. /, ' ')
    },

    resolved: function (val) {
      var d = new Deferred()
      d.resolve(val)
      return d
    },

    resolveUrl: function (baseUrl, relativeUrl) {
      if (this.isElectron()) {
        // url.resolve does not correctly resolve absolute file urls
        if (relativeUrl.substr(0, 8) === 'file:///') {
          return relativeUrl
        }
      }
      return url.resolve(baseUrl, relativeUrl)
    },

    loadJS: function (paths) {
      var d = new Deferred()
      dojo.global.require(paths, function () {
        var modules = Array.prototype.slice.call(arguments)

        // check the loaded modules for success
        for (var i = 0; i < modules.length; i++) {
          if (!{ object: true, function: true }[typeof modules[i]]) {
            d.reject(`could not load ${paths[i]}: ${modules[i]}`)
            return
          }
        }

        d.resolve(modules)
      })
      return d
    },

    isElectron: function () {
      var process = window.process
      return !!(process && process.versions && process.versions.electron)
    },

    parseLocString: function (locstring) {
      if (typeof locstring != 'string') {
        return null
      }
      locstring = locstring.trim()

      var location = {}

      // Strip out any extra info in parentheses?
      var extraRegex = new RegExp(
        [
          /^\s*/, // optional whitespace at start of locstring
          /(.+?)/, // capture remaining characters, non-greedily, as the locstring without the "extra" info
          /(\((.+?)\))?/, // capture the contents of the perentheses, if they exist, as the "extra" info
          /\s*$/, // optional whitespace at end locstring
        ]
          .map(function (r) {
            return r.source
          })
          .join(''),
      )

      var tokens_extra = locstring.match(extraRegex)

      locstring = tokens_extra[1]

      if (tokens_extra[3]) {
        location.extra = tokens_extra[3]
      }

      // Regex to match coordinate ranges, with or without a ref seq id
      var rangeRegex = new RegExp(
        [
          /^((.+):)?/, // ref seq id
          /\s*/, // optional whitespace preceeding range
          /-?([\d,]+(\.\d+)?)/, // extract positive integer part of first number - thousand separator (",") safe
          /\s*/, // optional whitespace
          /(\.{2,}|-+)/, // range separator of 2 or more dots OR 1 or more hyphen
          /\s*/, // optional whitespace
          /-?([\d,]+(\.\d+)?)/, // extract positive integer part of second number - thousand separator (",") safe
          /\s*$/, // optional whitespace
        ]
          .map(function (r) {
            return r.source
          })
          .join(''),
      )

      var rangeTokens = locstring.match(rangeRegex)

      if (rangeTokens) {
        // locstring specified a range
        location.ref = rangeTokens[2]
        location.start = Number(rangeTokens[3].replace(/\,/g, ''))
        location.end = Number(rangeTokens[6].replace(/\,/g, ''))

        // reverse the numbers if necessary
        if (location.start > location.end) {
          var t = location.start
          location.start = location.end
          location.end = t
        }
      } else {
        // locstring comprises a single point location coordinate, with or without a ref seq id
        var pointRegex = new RegExp(
          [
            /^((.+):)?/, // ref
            /\s*/, // optional whitespace
            /-?([\d,]+(\.\d+)?)?/, // extract positive integer part of first number - thousand separator (",") safe
            /\s*$/, // optional whitespace
          ]
            .map(function (r) {
              return r.source
            })
            .join(''),
        )

        var pointTokens = locstring.match(pointRegex)

        if (pointTokens) {
          if (pointTokens[2]) {
            location.ref = pointTokens[2]
          }
          if (pointTokens[3]) {
            location.start = Number(pointTokens[3].replace(/\,/g, ''))
            location.end = location.start
          } else {
            return null
          }
        } else {
          return null
        }
      }

      // Make coordinates 0-start, half-open (like BED cordinates)
      location.start = location.start - 1

      return location
    },

    basename: function (str, suffixList) {
      if (!str || !str.match) {
        return undefined
      }
      var m = str.match(/[\/\\]([^\/\\]+)[\/\/\/]*$/)
      var bn = m ? m[1] || undefined : str
      if (bn && suffixList) {
        if (!(suffixList instanceof Array)) {
          suffixList = [suffixList]
        }
        suffixList = array.map(suffixList, function (s) {
          return s.replace(/([\.\?\+])/g, '\\$1')
        })
        bn = bn.replace(new RegExp(`${suffixList.join('|')}$`, 'i'), '')
      }
      return bn
    },

    assembleLocString: function (loc_in, useExtra = true) {
      var s = '',
        types = {
          start: 'number',
          end: 'number',
          ref: 'string',
          strand: 'number',
        },
        location = {}
      // filter the incoming loc_in to only pay attention to slots that we
      // know how to handle
      for (var slot in types) {
        if (
          types[slot] == typeof loc_in[slot] &&
          (types[slot] != 'number' || !isNaN(loc_in[slot])) //filter any NaNs
        ) {
          location[slot] = loc_in[slot]
        }
      }

      //finally assemble our string
      if ('ref' in location) {
        s += location.ref
        if (location.start || location.end) {
          s += ':'
        }
      }
      if ('start' in location) {
        s += (Math.round(location.start) + 1).toFixed(0).toLocaleString()
        if ('end' in location) {
          s += '..'
        }
      }
      if ('end' in location) {
        s += Math.round(location.end).toFixed(0).toLocaleString()
      }

      if ('strand' in location) {
        s +=
          {
            1: ' (+ strand)',
            '-1': ' (- strand)',
            0: ' (no strand)',
          }[location.strand || ''] || ''
      }

      // add on any extra stuff if it was passed in
      if (useExtra && 'extra' in loc_in) {
        s += loc_in.extra
      }

      return s
    },

    /**
     * Complement a sequence (without reversing).
     * @param {String} seqString sequence
     * @returns {String} complemented sequence
     */
    complement: (function () {
      var compl_rx = /[ACGT]/gi

      // from bioperl: tr/acgtrymkswhbvdnxACGTRYMKSWHBVDNX/tgcayrkmswdvbhnxTGCAYRKMSWDVBHNX/
      // generated with:
      // perl -MJSON -E '@l = split "","acgtrymkswhbvdnxACGTRYMKSWHBVDNX"; print to_json({ map { my $in = $_; tr/acgtrymkswhbvdnxACGTRYMKSWHBVDNX/tgcayrkmswdvbhnxTGCAYRKMSWDVBHNX/; $in => $_ } @l})'
      var compl_tbl = {
        S: 'S',
        w: 'w',
        T: 'A',
        r: 'y',
        a: 't',
        N: 'N',
        K: 'M',
        x: 'x',
        d: 'h',
        Y: 'R',
        V: 'B',
        y: 'r',
        M: 'K',
        h: 'd',
        k: 'm',
        C: 'G',
        g: 'c',
        t: 'a',
        A: 'T',
        n: 'n',
        W: 'W',
        X: 'X',
        m: 'k',
        v: 'b',
        B: 'V',
        s: 's',
        H: 'D',
        c: 'g',
        D: 'H',
        b: 'v',
        R: 'Y',
        G: 'C',
      }

      var nbsp = String.fromCharCode(160)
      var compl_func = function (m) {
        return compl_tbl[m] || nbsp
      }
      return function (seqString) {
        return seqString.replace(compl_rx, compl_func)
      }
    })(),

    /**
     * Reverse-complement a sequence string.
     * @param {String} seqString
     * @returns {String} reverse-complemented sequence
     */
    revcom: function (seqString) {
      return Util.complement(seqString).split('').reverse().join('')
    },

    assembleLocStringWithLength: function (def) {
      var locString = Util.assembleLocString(def)
      var length = def.length || def.end - def.start
      return `${locString} (${Util.humanReadableNumber(length)}b)`
    },

    // given a possible reference sequence name and an object as { 'foo':
    // <refseq foo>, ... }, try to match that reference sequence name
    // against the actual name of one of the reference sequences.  returns
    // the reference sequence record, or null
    // if none matched.
    matchRefSeqName: function (name, refseqs) {
      for (var ref in refseqs) {
        if (!refseqs.hasOwnProperty(ref)) {
          continue
        }

        var ucname = name.toUpperCase()
        var ucref = ref.toUpperCase()

        if (
          ucname == ucref ||
          `CHR${ucname}` == ucref ||
          ucname == `CHR${ucref}`
        ) {
          return refseqs[ref]
        }
      }
      return null
    },

    /**
     * Wrap a handler function to be called 1ms later in a window timeout.
     * This will usually give a better stack trace for figuring out where
     * errors are happening.
     */
    debugHandler: function (context, func) {
      return function () {
        var args = arguments
        window.setTimeout(function () {
          var f = func
          if (typeof f == 'string') {
            f = context[f]
          }
          f.apply(context, args)
        }, 1)
      }
    },

    ucFirst: function (str) {
      if (typeof str != 'string') {
        return undefined
      }
      return str.charAt(0).toUpperCase() + str.slice(1)
    },

    /**
     * Uniqify an array.
     * @param stuff {Array} array of stuff
     * @param normalizer {Function} optional function to be called on
     * each element to convert them to a comparable string.  By
     * default, just does default stringification.
     */
    uniq: function (stuff, normalizer) {
      normalizer =
        normalizer ||
        function (t) {
          return `${t}`
        }
      var result = [],
        seen = {}
      dojo.forEach(stuff, function (thing) {
        var norm = normalizer(thing)
        if (!seen[normalizer(thing)]) {
          result.push(thing)
        }
        seen[norm] = true
      })
      return result
    },

    /**
     * Replace windows file path, e.g. C:\ to use file:/// prefixes
     */
    replacePath: function (path) {
      return path.replace(/^(\w):/, 'file:///$1:').replace(/\\/g, '/')
    },
    unReplacePath: function (path) {
      path = path.replace(/^file:\/\//, '')
      var process = window.process
      return process.platform === 'win32' && path[0] == '/'
        ? path.substr(1)
        : path
    },

    // back-compatible way to remove properties/attributes from DOM
    // nodes.  IE 7 and older do not support the `delete` operator on
    // DOM nodes.
    removeAttribute: function (domNode, attrName) {
      try {
        delete domNode[attrName]
      } catch (e) {
        if (domNode.removeAttribute) {
          domNode.removeAttribute(attrName)
        }
      }
    },
    // Return resolution, accounting for config possibly specifying that highres is disabled
    getResolution: function (ctx, highResolutionMode) {
      var ratio
      if (highResolutionMode == 'auto') {
        // finally query the various pixel ratios
        var devicePixelRatio = window.devicePixelRatio || 1
        var backingStoreRatio =
          ctx.webkitBackingStorePixelRatio ||
          ctx.mozBackingStorePixelRatio ||
          ctx.msBackingStorePixelRatio ||
          ctx.oBackingStorePixelRatio ||
          ctx.backingStorePixelRatio ||
          1
        ratio = Math.ceil(devicePixelRatio / backingStoreRatio)
      } else if (highResolutionMode == 'disabled') {
        ratio = 1
      } else {
        ratio = highResolutionMode
      }
      return ratio >= 1 ? ratio : 1
    },

    /**
     * flatten array like [ [1,2], [3,4] ] to [ 1,2,3,4 ]
     * @param {Array} ar
     */
    flattenOneLevel(ar) {
      const r = []
      for (let i = 0; i < ar.length; i += 1) {
        r.push(...ar[i])
      }
      return r
    },

    /**
     * Coerce a value of unknown type to a boolean, treating string 'true'
     * and 'false' as the values they indicate, and string numbers as
     * numbers.
     * @private
     */
    coerceBoolean: function (val) {
      if (typeof val == 'string') {
        val = val.toLowerCase()
        if (val == 'true') {
          return true
        } else if (val == 'false') {
          return false
        } else {
          return parseInt(val)
        }
      } else if (typeof val == 'boolean') {
        return val
      } else if (typeof val == 'number') {
        return !!val
      } else {
        return true
      }
    },

    intersect(x1, x2, y1, y2) {
      return x2 >= y1 && y2 >= x1
    },

    // orientation definitions from igv.js, see also https://software.broadinstitute.org/software/igv/interpreting_pair_orientations
    orientationTypes: {
      fr: {
        F1R2: 'LR',
        F2R1: 'LR',

        F1F2: 'LL',
        F2F1: 'LL',

        R1R2: 'RR',
        R2R1: 'RR',

        R1F2: 'RL',
        R2F1: 'RL',
      },

      rf: {
        R1F2: 'LR',
        R2F1: 'LR',

        R1R2: 'LL',
        R2R1: 'LL',

        F1F2: 'RR',
        F2F1: 'RR',

        F1R2: 'RL',
        F2R1: 'RL',
      },

      ff: {
        F2F1: 'LR',
        R1R2: 'LR',

        F2R1: 'LL',
        R1F2: 'LL',

        R2F1: 'RR',
        F1R2: 'RR',

        R2R1: 'RL',
        F1F2: 'RL',
      },
    },
  }

  return Util
})

/*

Copyright (c) 2007-2018 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
