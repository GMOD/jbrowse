define(['dojo/_base/declare', 'dojo/request', 'JBrowse/Util'], function (
  declare,
  request,
  Util,
) {
  return declare(
    'JBrowse.Store.LazyTrie',
    null,
    /**
     * @lends JBrowse.Store.LazyTrie.prototype
     */
    {
      /**
       * <pre>
       * Implements a lazy PATRICIA tree.
       *  This structure is a map where the keys are strings.  The map supports fast
       * queries by key string prefix ("show me all the values for keys that
       * start with "abc").  It also supports lazily loading subtrees.
       *
       * Each edge is labeled with a substring of a key string.
       * Each node in the tree has one or more children, each of which represents
       *   a potential completion of the string formed by concatenating all of the
       *   edge strings from that node up to the root.
       *   Nodes also have zero or one data items.
       * Leaves have zero or one data items.
       *
       * Each loaded node is an array.
       *    element 0 is the edge string;
       *    element 1 is the data item, or null if there is none;
       *    any further elements are the child nodes, sorted lexicographically
       *      by their edge string
       *
       *  Each lazy node is an array where the first element is the number of
       *  data items in the subtree rooted at that node, and the second element
       *  is the edge string for that node.
       *    when the lazy node is loaded, the lazy array gets replaced with
       *    a loaded node array; lazy nodes and loaded nodes can be distinguished by:
       *    "string" == typeof loaded_node[0]
       *    "number" == typeof lazy_node[0]
       *
       *  e.g., for the mappings:
       *    abc   => 0
       *    abcd  => 1
       *    abce  => "baz"
       *    abfoo => [3, 4]
       *    abbar (subtree to be loaded lazily)
       *
       *  the structure is:
       *
       *  [, , ["ab", ,
       *        [3, "bar"],
       *        ["c", 0, ["d", 1],
       *         ["e", "baz"]],
       *        ["foo", [3, 4]]
       *        ]
       *   ]
       *
       *  The main goals for this structure were to minimize the JSON size on
       *  the wire (so, no type tags in the JSON to distinguish loaded nodes,
       *  lazy nodes, and leaves) while supporting lazy loading and reasonably
       *  fast lookups.
       * </pre>
       *
       * @constructs
       */
      constructor: function (rootURL, chunkTempl) {
        this.rootURL = rootURL
        this.chunkTempl = chunkTempl
        var trie = this

        request(rootURL, { handleAs: 'json' }).then(
          function (o) {
            if (!o) {
              console.log('failed to load trie')
              return
            }
            trie.root = o
            trie.extra = o[0]
            if (trie.deferred) {
              trie.deferred.callee.apply(trie, trie.deferred)
              delete trie.deferred
            }
          },
          error => {
            console.log(
              'No name store configuration found and requesting the default root.json not found. Likely you have not run generate-names.pl yet. This is not essential for running JBrowse but will remove this message if it is run',
            )
            this.error = error
          },
        )
      },

      chunkUrl: function (prefix) {
        var chunkUrl = this.chunkTempl.replace('\{Chunk\}', prefix)
        return Util.resolveUrl(this.rootURL, chunkUrl)
      },

      pathToPrefix: function (path) {
        var node = this.root
        var result = ''
        loop: for (var i = 0; i < path.length; i++) {
          switch (typeof node[path[i]][0]) {
            case 'string': // regular node
              result += node[path[i]][0]
              break
            case 'number': // lazy node
              result += node[path[i]][1]
              break loop
          }
          node = node[path[i]]
        }
        return result
      },

      valuesFromPrefix: function (query, callback) {
        var trie = this
        this.findNode(
          query,
          function (prefix, node) {
            callback(trie.valuesFromNode(node))
          },
          function () {
            callback([])
          },
        )
      },

      mappingsFromPrefix: function (query, callback) {
        var trie = this
        this.findNode(
          query,
          function (prefix, node) {
            callback(trie.mappingsFromNode(prefix, node))
          },
          function () {
            callback([])
          },
        )
      },

      mappingsFromNode: function (prefix, node) {
        var results = []
        if (node[1] !== null) results.push([prefix, node[1]])
        for (var i = 2; i < node.length; i++) {
          if ('string' == typeof node[i][0]) {
            results = results.concat(
              this.mappingsFromNode(prefix + node[i][0], node[i]),
            )
          }
        }
        return results
      },

      valuesFromNode: function (node) {
        var results = []
        if (node[1] !== null) results.push(node[1])
        for (var i = 2; i < node.length; i++)
          results = results.concat(this.valuesFromNode(node[i]))
        return results
      },

      exactMatch: function (key, callback, notfoundCallback) {
        notfoundCallback = notfoundCallback || function () {}
        if (this.error) {
          notfoundCallback()
          return
        }

        var trie = this
        this.findNode(
          key,
          function (prefix, node) {
            if (prefix.toLowerCase() == key.toLowerCase() && node[1])
              callback(node[1])
          },
          notfoundCallback,
        )
      },

      findNode: function (query, foundCallback, notfoundCallback) {
        notfoundCallback = notfoundCallback || function () {}

        if (this.error) {
          notfoundCallback()
          return
        }

        var trie = this
        this.findPath(
          query,
          function (path) {
            var node = trie.root
            for (var i = 0; i < path.length; i++) node = node[path[i]]
            var foundPrefix = trie.pathToPrefix(path)
            foundCallback(foundPrefix, node)
          },
          notfoundCallback,
        )
      },

      findPath: function (query, foundCallback, notfoundCallback) {
        if (this.error) {
          notfoundCallback()
          return
        }

        notfoundCallback = notfoundCallback || function () {}

        if (!this.root) {
          notfoundCallback()
          return
        }
        query = query.toLowerCase()
        var node = this.root
        var qStart = 0
        var childIndex

        var path = []

        while (true) {
          childIndex = this.binarySearch(node, query.charAt(qStart))
          if (childIndex < 0) {
            notfoundCallback()
            return
          }
          path.push(childIndex)

          if ('number' == typeof node[childIndex][0]) {
            // lazy node
            var trie = this
            dojo.xhrGet({
              url: this.chunkUrl(this.pathToPrefix(path)),
              handleAs: 'json',
              load: function (o) {
                node[childIndex] = o
                trie.findPath(query, foundCallback)
              },
              error: err => {
                this.error = err
              },
            })
            return
          }

          node = node[childIndex]

          // if the current edge string doesn't match the
          // relevant part of the query string, then there's no
          // match
          if (
            query.substr(qStart, node[0].length) !=
            node[0].substr(0, Math.min(node[0].length, query.length - qStart))
          ) {
            notfoundCallback()
            return
          }

          qStart += node[0].length
          if (qStart >= query.length) {
            // we've reached the end of the query string, and we
            // have some matches
            foundCallback(path)
            return
          }
        }
      },

      binarySearch: function (a, firstChar) {
        var low = 2 // skip edge string (in 0) and data item (in 1)
        var high = a.length - 1
        var mid, midVal
        while (low <= high) {
          mid = (low + high) >>> 1
          switch (typeof a[mid][0]) {
            case 'string': // regular node
              midVal = a[mid][0].charAt(0)
              break
            case 'number': // lazy node
              midVal = a[mid][1].charAt(0)
              break
          }

          if (midVal < firstChar) {
            low = mid + 1
          } else if (midVal > firstChar) {
            high = mid - 1
          } else {
            return mid // key found
          }
        }

        return -(low + 1) // key not found.
      },
    },
  )
})

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
