define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/store/util/QueryResults',
  'JBrowse/Util',
  'JBrowse/Store/Hash',
  'JBrowse/Model/Location',
], function (declare, array, QueryResults, Util, HashStore, Location) {
  return declare(HashStore, {
    constructor: function (args) {
      this.tooManyMatchesMessage =
        args.tooManyMatchesMessage || '(too many matches to display)'

      // generate stopPrefixes
      var stopPrefixes = (this.stopPrefixes = {})
      // make our stopPrefixes an object as { prefix: true, ... }
      // with all possible prefixes of our stop prefixes
      if (args.stopPrefixes) {
        var prefixesInput =
          typeof args.stopPrefixes == 'string'
            ? [args.stopPrefixes]
            : args.stopPrefixes

        dojo.forEach(prefixesInput, function (prefix) {
          while (prefix.length) {
            stopPrefixes[prefix] = true
            prefix = prefix.substr(0, prefix.length - 1)
          }
        })
      }
    },

    _nameRecordToItem: function (nameRecord) {
      if (nameRecord.hitLimit) {
        // it's a too-many-matches marker
        return { name: this.tooManyMatchesMessage, hitLimit: true }
      } else {
        // it's an actual name record
        var item = {}
        if (typeof nameRecord == 'object') {
          item.name = nameRecord[0]
          var trackConfig = this._findTrackConfig(
            ((this.meta || {}).track_names || {})[nameRecord[1]],
          )
          item.location = new Location({
            ref: nameRecord[3],
            start: parseInt(nameRecord[4]),
            end: parseInt(nameRecord[5]),
            tracks: trackConfig ? [trackConfig] : null,
            objectName: nameRecord[0],
          })
        } else {
          item.name = nameRecord
        }
        return item
      }
    },

    // look in the browser's track configuration for the track with the given label
    _findTrackConfig: function (trackLabel) {
      if (!trackLabel) {
        return null
      }

      var track = null
      var i = array.some(this.browser.config.tracks, function (t) {
        if (t.label == trackLabel) {
          track = t
          return true
        }
        return false
      })

      return track
    },

    _makeResults: function (nameRecords) {
      // convert the name records into dojo.store-compliant data
      // items, sort them by name and location
      var results = array
        .map(nameRecords, dojo.hitch(this, '_nameRecordToItem'))
        .sort(function (a, b) {
          return (
            a.name.localeCompare(b.name) || a.location.localeCompare(b.location)
          )
        })

      var last
      var hitLimit

      // aggregate them and make labels for them.  for names with
      // multiple locations, make a multipleLocations member.
      results = array.filter(results, function (i) {
        if (i.hitLimit) {
          hitLimit = i
          if (!hitLimit.label) {
            hitLimit.label = hitLimit.name || 'too many matches'
          }
          return false
        } else if (last && last.name == i.name) {
          last.label =
            last.name +
            ' <span class="multipleLocations">multiple locations</span>'
          if (last.multipleLocations) {
            last.multipleLocations.push(i.location)
          } else {
            last.multipleLocations = [last.location, i.location]
            delete last.location
          }
          return false
        }
        last = i
        last.label =
          last.name +
          (last.location
            ? ' <span class="locString">' + last.location + '</span>'
            : '')
        return true
      })

      if (hitLimit) {
        results.push(hitLimit)
      }

      return QueryResults(results)
    },

    // case-insensitive, and supports prefix queries like 'foo*'
    async query(query, options) {
      // remove trailing asterisks from query.name
      var thisB = this
      var name = (query.name || '').toString()

      // lowercase the name if the store is all-lowercase
      // wait for the ready signal to test for lower case keys
      await this.ready
      if (this.meta.lowercase_keys) {
        name = name.toLowerCase()
      }

      var trailingStar = /\*$/
      if (trailingStar.test(name)) {
        name = name.replace(trailingStar, '')
        return this._getEntry(name).then(function (value) {
          value = value || {}
          return thisB._makeResults(
            (value.exact || []).concat(value.prefix || []),
          )
        })
      } else {
        return this._getEntry(name).then(function (value) {
          return thisB._makeResults((value || {}).exact || [])
        })
      }
    },

    get: function (id) {
      // lowercase the id if the store is all-lowercase
      if (this.meta.lowercase_keys) {
        id = id.toLowerCase()
      }

      return this._getEntry(id).then(function (bucket) {
        var nameRec = (bucket.exact || [])[0]
        return nameRec ? this._nameRecordToItem(nameRec) : null
      })
    },

    _getEntry: function (key) {
      return this._getBucket(key).then(function (bucket) {
        return bucket[key]
      })
    },
  })
})
