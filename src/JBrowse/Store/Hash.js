define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/store/JsonRest',
  'dojo/store/util/QueryResults',
  'JBrowse/Digest/Crc32',
  'JBrowse/Util',
], function (declare, array, dojoJSONRest, QueryResults, digest, Util) {
  return declare(null, {
    constructor: function (args) {
      // make sure url has a trailing slash
      var url = /\/$/.test(args.url) ? args.url : args.url + '/'
      this.bucketStore = new dojoJSONRest({
        target: url,
      })

      this.meta = {}

      this.browser = args.browser

      // this.ready is a Deferred that will be resolved when we have
      // read the meta.json file with the params of this hashstore
      this.ready = this._readMeta()
    },

    _readMeta: function () {
      var thisB = this
      return this.bucketStore.get('meta.json').then(function (meta) {
        dojo.mixin(thisB.meta, meta || {})
        thisB.meta.hash_hex_characters = Math.ceil(thisB.meta.hash_bits / 4)
      })
    },

    query: function (query, options) {
      return this.get((query.name || '').toString()).then(function (value) {
        return QueryResults((value || {}).exact || [])
      })
    },

    get: function (key) {
      return this._getBucket(key).then(function (bucket) {
        return bucket[key]
      })
    },

    _getBucket: function (key) {
      var thisB = this
      return this.ready.then(function () {
        var bucketIdent = thisB._hash(key)
        return thisB.bucketStore.get(thisB._hexToDirPath(bucketIdent)).then(
          function (value) {
            return value
          },
          function (err) {
            if (Util.isElectron() || err.status == 404) {
              // 404 is expected if the name is not in the store
              return {}
            }
          },
        )
      })
    },

    _hexToDirPath: function (hex) {
      // zero-pad the hex string to be 8 chars if necessary
      while (hex.length < 8) {
        hex = '0' + hex
      }
      hex = hex.substr(8 - this.meta.hash_hex_characters)
      var dirpath = []
      for (var i = 0; i < hex.length; i += 3) {
        dirpath.push(hex.substring(i, i + 3))
      }
      return dirpath.join('/') + '.json' + (this.meta.compress ? 'z' : '')
    },

    _hash: function (data) {
      return digest
        .objectFingerprint(data)
        .toString(16)
        .toLowerCase()
        .replace('-', 'n')
    },

    getIdentity: function (object) {
      return object.id
    },
  })
})
