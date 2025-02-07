/**
 * Configuration adaptor for JBrowse's text configuration format.
 * That is, the text configuration format that is not JSON.
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/json',

  'JBrowse/ConfigAdaptor/JB_json_v1',
], function (
  declare,
  lang,
  array,
  JSON,

  JB_json,
) {
  return declare([JB_json], {
    _isAlwaysArray: function (varname) {
      return { include: true }[varname]
    },

    parse_conf: function (text, load_args) {
      var section = [],
        keypath,
        operation,
        value
      var data = {}
      var lineNumber

      function recordVal() {
        if (value !== undefined) {
          try {
            var match
            // parse json
            if ((match = value.match(/^json:(.+)/i))) {
              value = JSON.parse(match[1])
            }
            // parse numbers if it looks numeric
            else if (/^[\+\-]?[\d\.,]+([eE][\-\+]?\d+)?$/.test(value)) {
              value = parseFloat(value.replace(/,/g, ''))
            }

            var path = section.concat(keypath).join('.')
            if (operation == '+=') {
              var existing = lang.getObject(path, false, data)
              if (existing) {
                if (!lang.isArray(existing)) {
                  existing = [existing]
                }
              } else {
                existing = []
              }
              existing.push(value)
              value = existing
            }
            if (value == 'true') {
              value = true
            }
            if (value == 'false') {
              value = false
            }
            lang.setObject(path, value, data)
          } catch (e) {
            throw new Error(
              'syntax error' +
                ((load_args.config || {}).url
                  ? ' in ' + load_args.config.url
                  : '') +
                (lineNumber ? ' at line ' + (lineNumber - 1) : ''),
            )
          }
        }
      }

      array.forEach(
        text.split('\n'),
        function (line, i) {
          lineNumber = i + 1
          line = line.replace(/^\s*#.+/, '')
          var match

          // new section
          if ((match = line.match(/^\s*\[([^\]]+)/))) {
            // new section
            recordVal()
            keypath = value = undefined
            section = match[1].trim().split(/\s*\.\s*/)
            if (section.length == 1 && section[0].toLowerCase() == 'general') {
              section = []
            }
          }
          // new value
          else if (
            (match = line.match(
              value == undefined
                ? /^([^\+=]+)(\+?=)(.*)/
                : /^(\S[^\+=]+)(\+?=)(.*)/,
            ))
          ) {
            recordVal()
            keypath = match[1].trim().split(/\s*\.\s*/)
            operation = match[2]
            if (this._isAlwaysArray(section.concat(keypath).join('.'))) {
              operation = '+='
            }
            value = match[3].trim()
          }
          // add to existing array value
          else if (
            keypath !== undefined &&
            (match = line.match(/^\s{0,4}\+\s*(.+)/))
          ) {
            recordVal()
            operation = '+='
            value = match[1].trim()
          }
          // add to existing value
          else if (value !== undefined && (match = line.match(/^\s+(\S.*)/))) {
            value += value.length ? ' ' + match[1].trim() : match[1].trim()
          }
          // done with last value
          else {
            recordVal()
            keypath = value = undefined
          }
        },
        this,
      )

      recordVal()

      return data
    },
  })
})
