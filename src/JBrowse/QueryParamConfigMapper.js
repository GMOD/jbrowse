/**
 * This library interprets options passed in via dot-notation instead of JSON in the Query URL.
 * The implementation is both for readability and security in some systems, esp. tomcat where
 * passing JSON in the Query URL is both bad-form and potentially insecure.
 *
 * This is the dot-object library: https://www.npmjs.com/package/dot-object
 *
 * Usage is depicted here:
 * http://gmod.org/wiki/JBrowse_Configuration_Guide#addFeatures
 *
 */
define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'JBrowse/Util/dot-object',
], function (declare, array, dotObject) {
  return declare(null, {
    constructor: function () {},

    generateUrl: function (input) {
      var returnObject = dotObject.dot(input)
      var returnString
      Object.keys(returnObject).forEach(function (key) {
        var stringEntry = `${key}=${returnObject[key]}`
        if (!returnString) {
          returnString = stringEntry
        } else {
          returnString += `&${stringEntry}`
        }
      })

      return returnString
    },

    generateJsonFromKeyArray: function (inputJson, keyArray, keyDepth, value) {
      if (!keyArray || keyArray.length == keyDepth) {
        return
      }

      var firstKey = keyArray[keyDepth - 1]
      // set value if the last one
      if (keyArray.length == keyDepth - 1) {
        inputJson[firstKey] = value
        return
      }

      // more keys available, so if nothing is set, just set to null
      if (!inputJson.hasOwnProperty(firstKey)) {
        inputJson[firstKey] = {}
      }
      this.generateJsonFromKeyArray(
        inputJson[firstKey],
        keyArray,
        ++keyDepth,
        value,
      )
    },

    mapParam: function (inputJson, queryParam) {
      var inputQA = queryParam.split('=')
      var query = inputQA[0]
      var value = inputQA[1]
      dotObject.str(query, value, inputJson)
    },

    generateJsonFromKey: function (inputJson, keyString) {
      var allParams = keyString.split('\&')
      var mapParamB = this.mapParam
      allParams.forEach(function (queryParam) {
        mapParamB(inputJson, queryParam)
      })
    },

    handleQueryParams: function (config, queryParams) {
      var queryNameArray, storeName, propertyName, internalStore
      var storeTracks = {}
      var storeBookmarks = {}

      var featuresArray = []
      var featureIndex

      Object.keys(queryParams).forEach(function (queryParam) {
        if (queryParam.indexOf('addStores\.') == 0) {
          queryNameArray = queryParam.split('\.')
          propertyName = queryNameArray.slice(1).join('.')
          dotObject.str(
            `stores.${propertyName}`,
            queryParams[queryParam],
            config,
          )
        } else if (queryParam.indexOf('addTracks\.') == 0) {
          queryNameArray = queryParam.split('\.')
          storeName = queryNameArray[1]
          internalStore = storeTracks[storeName] ? storeTracks[storeName] : {}
          propertyName = queryNameArray.slice(2).join('.')
          if (storeName !== 'none') {
            dotObject.str('store', storeName, internalStore)
          }
          dotObject.str(propertyName, queryParams[queryParam], internalStore)
          dotObject.str(storeName, internalStore, storeTracks)
        } else if (queryParam.indexOf('addBookmarks\.') == 0) {
          queryNameArray = queryParam.split('\.')
          storeName = queryNameArray[1]
          internalStore = storeBookmarks[storeName]
            ? storeBookmarks[storeName]
            : {}
          propertyName = queryNameArray.slice(2).join('.')
          dotObject.str(propertyName, queryParams[queryParam], internalStore)
          dotObject.str(storeName, internalStore, storeBookmarks)
        } else if (queryParam.indexOf('addFeatures\.') == 0) {
          queryNameArray = queryParam.split('\.')
          featureIndex = queryNameArray[1]
          propertyName = queryNameArray.slice(2).join('.')
          var feature = featuresArray[featureIndex]
          feature = feature ? feature : {}
          dotObject.str(propertyName, queryParams[queryParam], feature)
          featuresArray[featureIndex] = feature
        }
      })

      // convert to an array
      if (storeTracks) {
        // add one for each
        for (var track in storeTracks) {
          if (!config.tracks) {
            config.tracks = []
          }
          var storeTrack = storeTracks[track]
          config.tracks.push(storeTrack)
        }
      }

      if (storeBookmarks) {
        // add one for each
        for (var bookmark in storeBookmarks) {
          if (!config.bookmarks) {
            config.bookmarks = {}
          }
          if (!config.bookmarks.features) {
            config.bookmarks.features = []
          }
          var storeBookmark = storeBookmarks[bookmark]
          // explicitly try to handle loc strings?
          config.bookmarks.features.push(storeBookmark)
        }
      }

      if (featuresArray.length > 0) {
        config.stores = config.stores ? config.stores : {}
        config.stores.url = config.stores.url ? config.stores.url : {}
        config.stores.url.features = array.filter(featuresArray, function (el) {
          return el != null
        })
      }
    },
  })
})
