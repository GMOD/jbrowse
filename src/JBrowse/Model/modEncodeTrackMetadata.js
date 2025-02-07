define([
  'dojo/_base/declare',
  'dojo/data/util/simpleFetch',
  'JBrowse/Util',
], function (declare, simpleFetch, Util) {
  var dojof = Util.dojof

  var M = declare(
    null,

    /**
     * @lends JBrowse.Model.modEncodeTrackMetadata.prototype
     */
    {
      /**
       * Track metadata datasource that understands the format of the
       * modencode.js track metadata JSON currently (May 2012) used at
       * data.modencode.org.
       * @constructor
       * @param args.url {String} URL to fetch the metadata JSON from
       */
      constructor: function (args) {
        this.url = args.url
      },

      // dojo.data.api.Read support
      getValue: function (i, attr, defaultValue) {
        var v = i[attr]
        return typeof v == 'undefined' ? defaultValue : v
      },
      getValues: function (i, attr) {
        var a = [i[attr]]
        return typeof a[0] == 'undefined' ? [] : a
      },

      getAttributes: function (item) {
        return dojof.keys(item)
      },

      hasAttribute: function (item, attr) {
        return item.hasOwnProperty(attr)
      },

      containsValue: function (item, attribute, value) {
        return item[attribute] == value
      },

      isItem: function (item) {
        return typeof item == 'object' && typeof item.label == 'string'
      },

      isItemLoaded: function () {
        return true
      },

      loadItem: function (args) {},

      // used by the dojo.data.util.simpleFetch mixin to implement fetch()
      _fetchItems: function (keywordArgs, findCallback, errorCallback) {
        dojo.xhrGet({
          url: this.url,
          handleAs: 'json',
          load: dojo.hitch(this, function (data) {
            var items = []
            dojo.forEach(
              data.items || [],
              function (i) {
                if (dojo.isArray(i.Tracks)) {
                  dojo.forEach(
                    i.Tracks,
                    function (trackName) {
                      var item = dojo.clone(i)
                      item.key = item.label
                      item.label = trackName
                      delete item.Tracks
                      items.push(item)
                    },
                    this,
                  )
                }
              },
              this,
            )
            findCallback(items, keywordArgs)
          }),
          error: function (e) {
            errorCallback(e, keywordArgs)
          },
        })
      },

      getFeatures: function () {
        return {
          'dojo.data.api.Read': true,
          'dojo.data.api.Identity': true,
        }
      },
      close: function () {},

      getLabel: function (i) {
        return this.getValue(i, 'key', undefined)
      },
      getLabelAttributes: function (i) {
        return ['key']
      },

      // dojo.data.api.Identity support
      getIdentityAttributes: function () {
        return ['label']
      },
      getIdentity: function (i) {
        return this.getValue(i, 'label', undefined)
      },
      fetchItemByIdentity: function (id) {
        return this.identIndex[id]
      },
    },
  )

  dojo.extend(M, simpleFetch)

  return M
})
