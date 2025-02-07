/**
 * dojo.data.api.Read-compatible store object that reads data from an
 * encapsulated JBrowse/Store/LazyTrie.
 */

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'JBrowse/Util',
  'JBrowse/Model/Location',
], function (declare, array, Util, Location) {
  return declare(
    null,
    /**
     * @lends JBrowse.Store.Autocomplete.prototype
     */
    {
      /**
       * @constructs
       * @param args.namesTrie
       * @param args.stopPrefixes
       * @param args.resultLimit
       * @param args.tooManyMatchesMessage
       */
      constructor: function (/**Object*/ args) {
        if (!args.namesTrie) {
          throw 'must provide a namesTrie argument'
        }

        this.namesTrie = args.namesTrie

        this.resultLimit = args.resultLimit || 15
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

        // make a self-modifying method for extracting the that
        // detects whether the name store is formatted with tools
        // pre-1.4 or post-1.4.  for pre-1.4 formats, will just
        // complete with the lower-case version of the name.  for
        // post-1.4, use the original-case version that's stored in
        // the name record.
        this.nodeText = function (node) {
          if (typeof node[1][0][0] == 'number') {
            // pre-1.4, for backcompat
            this.nodeText = function (node) {
              return node[0]
            }
          } else {
            // post-1.4
            this.nodeText = function (node) {
              return node[1][0][0]
            }
          }
          return this.nodeText(node)
        }
      },

      getFeatures: function () {
        return {
          'dojo.data.api.Read': true,
          'dojo.data.api.Identity': true,
        }
      },

      // dojo.data.api.Read support

      fetch: function (/**Object*/ request) {
        var start = request.start || 0
        var matchLimit = Math.min(
          this.resultLimit,
          Math.max(0, request.count || Infinity),
        )
        var matchesRemaining = matchLimit
        var scope = request.scope || dojo.global
        var aborted = false

        // wrap our abort function to set a flag
        request.abort = function () {
          var oldabort = request.abort || function () {}
          return function () {
            aborted = true
            oldabort.call(scope, request)
          }
        }.call(this)

        if (!request.store) {
          request.store = this
        }

        if (request.onBegin) {
          request.onBegin.call(scope, 0, request)
        }

        var prefix = (request.query.name || '').toString().replace(/\*$/, '')

        if (!this.stopPrefixes[prefix]) {
          this.namesTrie.mappingsFromPrefix(
            prefix,
            dojo.hitch(this, function (tree) {
              var matches = []

              if (aborted) {
                return
              }

              // are we working with a post-JBrowse 1.4 data structure?
              var post1_4 =
                tree[0] &&
                tree[0][1] &&
                tree[0][1][0] &&
                typeof tree[0][1][0][0] == 'string'

              // use dojo.some so that we can break out of the loop when we hit the limit
              dojo.some(
                tree,
                function (node) {
                  if (matchesRemaining--) {
                    var name = this.nodeText(node)
                    array.forEach(
                      node[1],
                      function (n) {
                        var location = new Location({
                          ref: n[post1_4 ? 3 : 2],
                          start: parseInt(n[post1_4 ? 4 : 3]),
                          end: parseInt(n[post1_4 ? 5 : 4]),
                          tracks: [this.namesTrie.extra[n[post1_4 ? 1 : 0]]],
                          objectName: name,
                        })

                        matches.push({
                          name: name,
                          location: location,
                        })
                      },
                      this,
                    )
                  }
                  return matchesRemaining < 0
                },
                this,
              )

              // if we found more than the match limit
              if (matchesRemaining < 0) {
                matches.push({
                  name: this.tooManyMatchesMessage,
                  hitLimit: true,
                })
              }

              if (request.sort) {
                matches.sort(
                  dojo.data.util.sorter.createSortFunction(request.sort, this),
                )
              }
              if (!aborted && request.onItem) {
                dojo.forEach(matches, function (item) {
                  if (!aborted) {
                    request.onItem.call(scope, item, request)
                  }
                })
              }
              if (!aborted && request.onComplete) {
                request.onComplete.call(scope, matches, request)
              }
            }),
          )
        } else if (request.onComplete) {
          request.onComplete.call(scope, [], request)
        }

        return request
      },

      getValue: function (i, attr, defaultValue) {
        var v = i[attr]
        return typeof v == 'undefined' ? defaultValue : v
      },
      getValues: function (i, attr) {
        var a = [i[attr]]
        return typeof a[0] == 'undefined' ? [] : a
      },

      getAttributes: function (item) {
        return Util.dojof.keys(item)
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

      close: function () {},

      getLabel: function (i) {
        return this.getValue(i, 'name', undefined)
      },
      getLabelAttributes: function (i) {
        return ['name']
      },

      getIdentity: function (i) {
        return this.getLabel(i)
      },
    },
  )
})
