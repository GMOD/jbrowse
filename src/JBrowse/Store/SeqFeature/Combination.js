define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/Deferred',
  'JBrowse/Model/SimpleFeature',
  'JBrowse/Store/SeqFeature/CombinationBase',
], function (declare, array, Deferred, SimpleFeature, CombinationBaseStore) {
  return declare([CombinationBaseStore], {
    // An implementation of CombinationBase that deals with set-type features (without score, as in HTMLFeatures tracks).
    // Usual operations are things like intersection, union, set subtraction and XOR.

    // Creates features from spans.  Essentially copies the basic span information and adds a feature id.
    createFeatures: function (spans) {
      var features = []
      //Validate this next time...
      for (var span in spans) {
        var id =
          'comfeat_' +
          spans[span].start +
          '.' +
          spans[span].end +
          '.' +
          spans[span].strand
        features.push(
          new SimpleFeature({
            data: {
              start: spans[span].start,
              end: spans[span].end,
              strand: spans[span].strand,
            },
            id: id,
          }),
        )
      }
      return features
    },

    // Defines the various set-theoretic operations that may occur and assigns each to a span-making function.
    // Passes the two sets of spans to the appropriate operator function.
    opSpan: function (op, span1, span2, query) {
      switch (op) {
        case '&':
          return this.andSpan(span1, span2)
        case 'U':
          return this.orSpan(span1, span2)
        case 'X':
          return this.andSpan(
            this.orSpan(span1, span2),
            this.notSpan(this.andSpan(span1, span2), query),
          )
        case 'S':
          return this.andSpan(span1, this.notSpan(span2, query))
        default:
          console.error('Invalid boolean operation: ' + op)
      }
      return undefined
    },

    // given a set of features, takes the "union" of them and outputs a single set of nonoverlapping spans
    toSpan: function (features, query) {
      // strip away extra stuff and keep only the relevant feature data
      var rawSpans = this._rawToSpan(features, query)

      // Splits the spans based on which strand they're on, and remove overlap from each strand's spans, recombining at the end.
      return this._removeOverlap(this._strandFilter(rawSpans, +1)).concat(
        this._removeOverlap(this._strandFilter(rawSpans, -1)),
      )
    },

    _rawToSpan: function (features, query) {
      // given a set of features, makes a set of spans with the
      // same start and end points (a.k.a. pseudo-features)
      var spans = []
      for (var feature in features) {
        if (features.hasOwnProperty(feature)) {
          spans.push({
            start: features[feature].get('start'), //Math.max( features[feature].get('start'), query.start ),
            end: features[feature].get('end'), //Math.min( features[feature].get('end'),   query.end   ),
            strand: features[feature].get('strand'),
          })
        }
      }
      return spans
    },

    // Filters an array of spans based on which strand of the reference sequence they are attached to
    _strandFilter: function (spans, strand) {
      return array
        .filter(spans, function (item) {
          return item.strand == strand || !item.strand
        })
        .map(function (item) {
          if (!item.strand)
            return {
              start: item.start,
              end: item.end,
              strand: strand,
            }
          // Adds strand to strandless spans
          else return item
        })
    },

    // converts overlapping spans into their union.  Assumes the spans are all on the same strand.
    _removeOverlap: function (spans) {
      if (!spans.length) {
        return []
      }
      spans.sort(function (a, b) {
        return a.start - b.start
      })
      return this._removeOverlapSorted(spans)
    },

    // Given an array of spans sorted by their start bp, converts them into a single non-overlapping set (ie takes their union).
    _removeOverlapSorted: function (spans) {
      var retSpans = []
      var i = 0
      var strand = spans[0].strand
      while (i < spans.length) {
        var start = spans[i].start
        var end = spans[i].end
        while (i < spans.length && spans[i].start <= end) {
          end = Math.max(end, spans[i].end)
          i++
        }
        retSpans.push({ start: start, end: end, strand: strand })
      }
      return retSpans
    },

    // given two sets of spans without internal overlap, outputs a set corresponding to their union.
    orSpan: function (span1, span2) {
      return this._computeUnion(
        this._strandFilter(span1, 1),
        this._strandFilter(span2, 1),
      ).concat(
        this._computeUnion(
          this._strandFilter(span1, -1),
          this._strandFilter(span2, -1),
        ),
      )
    },

    // given two sets of spans without internal overlap, outputs a set corresponding to their intersection
    andSpan: function (span1, span2) {
      return this._computeIntersection(
        this._strandFilter(span1, 1),
        this._strandFilter(span2, 1),
      ).concat(
        this._computeIntersection(
          this._strandFilter(span1, -1),
          this._strandFilter(span2, -1),
        ),
      )
    },

    // This method should merge two sorted span arrays in O(n) time, which is better
    // then using span1.concat(span2) and then array.sort(), which takes O(n*log(n)) time.
    _sortedArrayMerge: function (span1, span2) {
      var newArray = []
      var i = 0
      var j = 0
      while (i < span1.length && j < span2.length) {
        if (span1[i].start <= span2[j].start) {
          newArray.push(span1[i])
          i++
        } else {
          newArray.push(span2[j])
          j++
        }
      }
      if (i < span1.length) {
        newArray = newArray.concat(span1.slice(i, span1.length))
      } else if (j < span2.length) {
        newArray = newArray.concat(span2.slice(j, span2.length))
      }
      return newArray
    },

    // A helper method for computing the union of two arrays of spans.
    _computeUnion: function (span1, span2) {
      if (!span1.length && !span2.length) {
        return []
      }
      return this._removeOverlapSorted(this._sortedArrayMerge(span1, span2))
    },

    // A helper method for computing the intersection of two arrays of spans.
    _computeIntersection: function (span1, span2) {
      if (!span1.length || !span2.length) {
        return []
      }

      var allSpans = this._sortedArrayMerge(span1, span2)
      var retSpans = []

      var maxEnd = allSpans[0].end
      var strand = span1[0].strand // Assumes both span sets contain only features for one specific strand
      var i = 1
      while (i < allSpans.length) {
        var start = allSpans[i].start
        var end = Math.min(allSpans[i].end, maxEnd)
        if (start < end) {
          retSpans.push({ start: start, end: end, strand: strand })
        }
        maxEnd = Math.max(allSpans[i].end, maxEnd)
        i++
      }

      return retSpans
    },

    // Filters span set by strand, inverts the sets represented on each strand, and recombines.
    notSpan: function (spans, query) {
      return this._rawNotSpan(this._strandFilter(spans, +1), query, +1).concat(
        this._rawNotSpan(this._strandFilter(spans, -1), query, -1),
      )
    },

    // Converts a set of spans into its complement in the reference sequence.
    _rawNotSpan: function (spans, query, strand) {
      var invSpan = []
      invSpan[0] = { start: query.start }
      var i = 0
      for (var span in spans) {
        if (spans.hasOwnProperty(span)) {
          span = spans[span]
          invSpan[i].strand = strand
          invSpan[i].end = span.start
          i++
          invSpan[i] = { start: span.end }
        }
      }
      invSpan[i].strand = strand
      invSpan[i].end = query.end
      if (invSpan[i].end <= invSpan[i].start) {
        invSpan.splice(i, 1)
      }
      if (invSpan[0].end <= invSpan[0].start) {
        invSpan.splice(0, 1)
      }
      return invSpan
    },

    loadRegion: function (region) {
      var d = new Deferred()

      if (this.stores.length == 1) {
        d.resolve(this, true)
        return d.promise
      }
      var thisB = this
      var regionLoaded = region
      regionLoaded.spans = []

      delete this.regionLoaded

      this._getFeatures(
        region,
        function () {},
        function (results) {
          if (results && results.spans) {
            regionLoaded.spans = results.spans
            thisB.regionLoaded = regionLoaded
          }
          d.resolve(thisB, true)
        },
        function () {
          d.reject('cannot load region')
        },
      )
      return d.promise
    },
  })
})
