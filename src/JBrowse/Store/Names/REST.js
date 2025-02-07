define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/store/util/QueryResults',
  'dojo/request/xhr',
  'dojo/io-query',

  'JBrowse/Store/Hash',
], function (
  declare,
  array,
  QueryResults,
  xhr,
  ioQuery,

  HashStore,
) {
  return declare(null, {
    constructor: function (args) {
      this.url = args.url
    },

    query: function (query, options) {
      var thisB = this

      var op = 'equals'
      var name = '' + query.name
      if (/\*$/.test(name)) {
        name = name.replace(/\*$/, '')
        op = 'startswith'
      }
      var myquery = {}
      myquery[op] = name

      return xhr(thisB.url + '?' + ioQuery.objectToQuery(myquery), {
        handleAs: 'json',
      }).then(
        function (data) {
          for (var i = 0; i < data.length; i++) {
            var dat = data[i]
            dat.label =
              dat.name +
              (dat.location
                ? '<span class="locString">' +
                  dat.location.ref +
                  ':' +
                  dat.location.start +
                  '..' +
                  dat.location.end +
                  ' (' +
                  dat.name +
                  ')' +
                  '</span>'
                : '')
          }
          return QueryResults(data)
        },
        function (err) {
          // Handle the error condition
          return QueryResults([])
        },
      )
    },

    get: function (id) {
      return this.query(id, undefined)
    },

    getIdentity: function (object) {
      return object.id
    },
  })
})
