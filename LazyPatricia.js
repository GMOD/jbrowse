/*
  Implements a lazy PATRICIA tree.

  This class is a map where the keys are strings.  The map supports fast
  queries by key string prefix ("show me all the values for keys that
  start with "abc").  It also supports lazily loading subtrees.

  Each edge is labeled with a substring of a key string.
  Each node in the tree has one or more children, each of which represents
    a potential completion of the string formed by concatenating all of the
    edge strings from that node up to the root.
    Nodes also have zero or one data items.
  Leaves have zero or one data items.
 
  Each loaded node is an array.
    element 0 is the edge string;
    element 1 is the data item, or undefined if there is none;
    any further elements are the child nodes, sorted lexicographically
      by their edge string

  Each lazy node is just the edge string for the edge leading to the lazy node.
    when the lazy node is loaded, the string gets replaced with a loaded
    node array; lazy nodes and loaded nodes can be distinguished by:
    "string" == typeof lazy_node
    "object" == typeof loaded_node

  e.g., for the mappings:
    abc   => 0
    abcd  => 1
    abce  => "baz"
    abfoo => [3, 4]
    abbar (subtree to be loaded lazily)

  the structure is:

  [, , ["ab", ,
        "bar",
        ["c", 0, ["d", 1],
         ["e", "baz"]],
        ["foo", [3, 4]]
        ]
   ]

  The main goals for this structure were to minimize the JSON size on
  the wire (so, no type tags in the JSON to distinguish loaded nodes,
  lazy nodes, and leaves) while supporting lazy loading and reasonably
  fast lookups.
 */

function LazyTrie(baseURL, rootURL) {
    this.baseURL = baseURL;
    var trie = this;

    dojo.xhrGet({url: rootURL, 
		 handleAs: "json",
		 load: function(o) { trie.root = o; }
	});
}

LazyTrie.prototype.pathToPrefix = function(path) {
    var node = this.root;
    var result = "";
    for (var i = 0; i < path.length; i++) {
        switch(typeof node[path[i]]) {
        case 'object': // regular node
            result += node[path[i]][0];
            break;
        case 'string': // lazy node
            result += node[path[i]];
            break;
        }
        node = node[path[i]];
    }
    return result;
}

LazyTrie.prototype.valuesFromPrefix = function(query, callback) {
    var trie = this;
    this.findNode(query, function(path) {
            var node = trie.root
            for (i = 0; i < path.length; i++)
                node = node[path[i]];
            callback(trie.valuesFromNode(node));
        });
}

LazyTrie.prototype.mappingsFromPrefix = function(query, callback) {
    var trie = this;
    this.findNode(query, function(path) {
            var node = trie.root
            for (i = 0; i < path.length; i++)
                node = node[path[i]];
            var foundPrefix = trie.pathToPrefix(path);
            callback(trie.mappingsFromNode(foundPrefix, node));
        });
}

LazyTrie.prototype.mappingsFromNode = function(prefix, node) {
    var results = [];
    if (node[1] !== undefined)
        results.push([prefix, node[1]]);
    for (var i = 2; i < node.length; i++)
        results = results.concat(this.mappingsFromNode(prefix + node[i][0],
                                                       node[i]));
    return results;
}

LazyTrie.prototype.valuesFromNode = function(node) {
    var results = [];
    if (node[1] !== undefined)
        results.push(node[1]);
    for (var i = 2; i < node.length; i++)
        results = results.concat(this.valuesFromNode(node[i]));
    return results;
}

LazyTrie.prototype.findNode = function(query, callback) {
    var node = this.root;
    var qStart = 0;
    var childIndex;

    var path = [];

    while(true) {
        childIndex = this.binarySearch(node, query.charAt(qStart));
        if (childIndex < 0) return;
        path.push(childIndex);

        if ('string' == typeof node[childIndex]) {
            // lazy node
            var trie = this;
            dojo.xhrGet({url: this.baseURL + this.pathToPrefix(path) + ".json",
                         handleAs: "json",
                         load: function(o) {
                             node[childIndex] = o;
                             trie.findNode(query, callback);
                         }
                        });
            return;
        }

        node = node[childIndex];

        // if the current edge string doesn't match the
        // relevant part of the query string, then there's no
        // match
        if (query.substr(qStart, node[0].length)
            != node[0].substr(0, Math.min(node[0].length, 
                                          query.length - qStart)))
            return;

        qStart += node[0].length;
        if (qStart >= query.length) {
            // we've reached the end of the query string, and we
            // have some matches
            callback(path);
            return;
        }
    }

    return null;
}

LazyTrie.prototype.binarySearch = function(a, firstChar) {
    var low = 2; // skip edge string (in 0) and data item (in 1)
    var high = a.length - 1;
    var mid, midVal;
    while (low <= high) {
        mid = (low + high) >>> 1;
        switch(typeof a[mid]) {
        case 'object': // regular node
            midVal = a[mid][0].charAt(0);
            break;
        case 'string': // lazy node
            midVal = a[mid].charAt(0);
            break;
        }

        if (midVal < firstChar) {
            low = mid + 1;
        } else if (midVal > firstChar) {
            high = mid - 1;
        } else {
            return mid; // key found
        }
    }

    return -(low + 1);  // key not found.
}
