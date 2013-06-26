define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/Model/SimpleFeature',
           'JBrowse/Store/SeqFeature/CombinationBase'
       ],
       function(
           declare,
           array,
           SimpleFeature,
           CombinationBaseStore
       ) {

return declare([CombinationBaseStore], {

_setGlobalStats: function() {
    this.globalStats.featureCount = this.featureArray.length;
    this.globalStats.featureDensity = this.featureArray.length/this.refSeq.length;
    this._deferred.stats.resolve(true);
},

// Inherits getGlobalStats and getRegionStats from the superclasses.  
// If we want any region stats or any global stats other than featureCount and featureDensity,
// We'll have to add them into this file later.
// Regional stats would be added by combining the "score" features of the underlying stores and
// using the combined data to create a "score" feature for each of the features in this.featureArray.


createFeatures: function(spans) {
    var features = [];
    //Validate this next time...
    for(var span in spans) {
        var id = "comfeat_" + spans[span].start + "." + spans[span].end + "." + spans[span].strand;
        features.push(new SimpleFeature({data: {start: spans[span].start, end: spans[span].end, strand: spans[span].strand}, id: id}));
    }
    return features;
},


// Defines the various set-theoretic operations that may occur and assigns each to a span-making function.
opSpan: function(op, span1, span2, query) {
    switch (op) {
        case "&" :
            return this.andSpan(span1, span2);
            break;
        case "U" :
            return this.orSpan(span1, span2);
            break;
        case "X" :
            return this.andSpan(this.orSpan(span1, span2), this.notSpan(this.andSpan(span1, span2), query));
            break;
        case "S" :
            return this.andSpan( span1, this.notSpan(span2, query) );
            break;
        default :
            console.error("Invalid boolean operation: "+op);
            break;
    }
    return undefined;
},

/* notes for this section: 
        -A span object contains a "start" and "end". 
        -The variables "features" and "feature" are often
         pseudo-features (span objects with endpoints that match real features)
*/


toSpan: function(features, query) {
    // given a set of features, takes the "union" of them and outputs a single set of nonoverlapping spans
    var rawSpans = this._rawToSpan(features,query);
    return this._removeOverlap(this._strandFilter(rawSpans, +1)).concat(this._removeOverlap(this._strandFilter(rawSpans, -1)));
    
},

_rawToSpan: function( features, query ) {
    // given a set of features, makes a set of span objects with the
    // same start and end points (a.k.a. pseudo-features)
    var spans = [];
    for (var feature in features) {
        if (features.hasOwnProperty(feature)) {
            spans.push( { start: features[feature].get('start'), //Math.max( features[feature].get('start'), query.start ), 
                          end:   features[feature].get('end'), //Math.min( features[feature].get('end'),   query.end   ),
                          strand: features[feature].get('strand') } );
        }    }
    return spans;
},

_strandFilter: function( spans, strand ) {
    return array.filter( spans, function(item) {
                                                return item.strand == strand || !item.strand;
                                            });
},

_removeOverlap: function( spans ) {
    // converts overlapping spans into their union.  Assumes the spans are all on the same strand.
    if(!spans.length) return [];
    spans.sort(function(a,b) { return a.start - b.start; });
    return this._removeOverlapSorted(spans);
    
},

_removeOverlapSorted: function( spans ) {
    var retSpans = [];
    var i = 0;
    var strand = spans[0].strand;
    while(i < spans.length) {
        var start = spans[i].start;
        var end = spans[i].end;
        while(i < spans.length && spans[i].start <= end) {
            end = Math.max(end, spans[i].end);
            i++;
        }
        retSpans.push( { start: start, end: end, strand: strand});
    }
    return retSpans;
},

orSpan: function( span1, span2 ){
    // given two sets of spans without internal overlap, outputs a set corresponding to their union.
    return this._computeUnion(this._strandFilter(span1, 1), this._strandFilter(span2, 1))
        .concat(this._computeUnion(this._strandFilter(span1,-1), this._strandFilter(span2,-1)));
},

andSpan: function( span1, span2){

    return this._computeIntersection(this._strandFilter(span1, 1), this._strandFilter(span2,1))
        .concat(this._computeIntersection(this._strandFilter(span1,-1), this._strandFilter(span2,-1)));

},

spanLoop: function( spans ) {
    var msg = "";
    for(var span in spans) {
        msg = msg + spans[span].start + " " + spans[span].end + " " + spans[span].strand + "\n";
    }
    if(msg.length > 0) { alert(msg);}
},

_sortedArrayMerge: function( span1, span2) {
    // This algorithm should merge two sorted span arrays in O(n) time, which is better
    // then using span1.concat(span2) and then array.sort(), which takes O(n*log(n)) time.
    var newArray = [];
    var i = 0;
    var j = 0;
    while(i < span1.length && j < span2.length) {
        if( span1[i].start <= span2[j].start ) {
            newArray.push(span1[i]);
            i++;
        } else {
            newArray.push(span2[j]);
            j++;
        }
    }
    if(i < span1.length) {
        newArray = newArray.concat(span1.slice(i, span1.length));
    } else if(j < span2.length) {
        newArray = newArray.concat(span2.slice(j, span2.length));
    }
    return newArray;
},

_computeUnion: function( span1, span2) {
    if(!span1.length && !span2.length) return [];
    return this._removeOverlapSorted(this._sortedArrayMerge(span1,span2));
},

_computeIntersection: function( span1, span2) {
    if(!span1.length || !span2.length) return [];

    var allSpans = this._sortedArrayMerge(span1, span2);
    var retSpans = [];
    
    var maxEnd = allSpans[0].end;
    var strand = span1[0].strand; // Assumes both span sets contain only features for one specific strand
    var i = 1;
    while(i < allSpans.length) {
        var start = allSpans[i].start;
        var end = Math.min(allSpans[i].end, maxEnd);
        if(start < end) retSpans.push({start: start, end: end, strand: strand});
        maxEnd = Math.max(allSpans[i].end, maxEnd);
        i++;
    }

    return retSpans;
},

notSpan: function( spans, query) {
    return this._rawNotSpan(this._strandFilter(spans, +1), query, +1).concat(this._rawNotSpan(this._strandFilter(spans, -1), query, -1)); 
},

_rawNotSpan: function( spans, query, strand ) {
    // creates the compliment spans of the input spans
    var invSpan = [];
    invSpan[0] = { start: query.start };
    var i = 0;
    for (span in spans) {
        if (spans.hasOwnProperty(span)) {
            span = spans[span];
            invSpan[i].strand = strand;
            invSpan[i].end = span.start;
            i++;
            invSpan[i] = { start: span.end };
        }
    }
    invSpan[i].strand = strand;
    invSpan[i].end = query.end;
    if (invSpan[i].end <= invSpan[i].start) {
        invSpan.splice(i,1);
    }
    if (invSpan[0].end <= invSpan[0].start) {
        invSpan.splice(0,1);
    }
    return invSpan;
}



});
});