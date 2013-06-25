define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/Deferred',
           'dojo/when',
           'dojo/promise/all',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Model/SimpleFeature',
           'JBrowse/Util',
           'JBrowse/Store/SeqFeature/Combination/TreeNode'
       ],
       function(
           declare,
           array,
           Deferred,
           when,
           all,
           SeqFeatureStore,
           DeferredStatsMixin,
           SimpleFeature,
           Util,
           TreeNode
       ) {

var featureWrapper = Util.fastDeclare(
    {
        get: function( arg ) { 
            return this.feature.get(arg);
        },

        id: function() { 
            return this.feature.id()+this.storeName;
        },

        parent: function() { 
            return this.feature.parent();
        },

        children: function() { 
            return this.feature.children();
        },

        tags: function() { 
            return this.feature.tags();
        },

        constructor: function( feat, storeName ) {
            this.feature = feat;
            this.storeName = storeName;
            this.source = feat.source || undefined;
        }
    }
);

var Keys = function(array) {
    var keys = []
    for (var key in array) {
        if (array.hasOwnProperty(key)) {
            keys.push(key);
        }
    }
    return keys;
};

return declare([SeqFeatureStore, DeferredStatsMixin], {

constructor: function( args ) {

    this.isCombinationStore = true;

    // can pass store objects in as args
    this.defaultOp = args.op || "&";
    this.ref = this.config.refSeq;
    
    if(args.opTree) this.reload(args.opTree);
    
    // This code has been stripped of the store promises, since I'm pretty sure we don't need them anymore.
    // If we do, we'll have to go back to a previous commit to find it.

},

reload: function( optree ) {
    this._deferred.features = new Deferred();
    this._deferred.stats = new Deferred();
    var refSeq;

    //if( !defaultOp) defaultOp = this.defaultOp;
    if( !optree) optree = new TreeNode({ Value: this.defaultOp});;
    if( !refSeq) refSeq = this.ref;
    this.opTree = optree;
    this.stores = optree.getLeaves() || [];

    for(var store in this.stores) if(!this.stores[store].name) this.stores = [];
    var thisB = this;
    
    // check if there are stores
    if (!Keys(thisB.stores).length) {
        //thisB._deferred.features.reject(" No stores were loaded.");
    }

    var featureArrays = {};

    var globalQuery =   {
                            ref: refSeq,
                            start: refSeq.start,
                            end: refSeq.end
                        };

    var fetchAllFeatures = thisB.stores.map(
        function (store) {
            var d = new Deferred();
            if ( !featureArrays[store.name] ) {
                featureArrays[store.name] = [];
            }
            store.getFeatures(
                globalQuery,
                dojo.hitch( this, function( feature ) {
                    var feat = new featureWrapper( feature, store.name );
                    featureArrays[store.name].push( feat );
                }),
                function(){d.resolve( featureArrays[store.name] ); },
                function(){d.reject("Error fetching features for store " + store.name);
                console.log("Error");}
            );
            return d.promise;
        }
    );
        
    when( all( fetchAllFeatures ), function() {
        // Create a set of spans based on the evaluation of the operation tree
        thisB.spans = thisB.evalTree(featureArrays, thisB.opTree, globalQuery);
        thisB.featureArray = thisB.createFeatures(thisB.spans);
        thisB._deferred.features.resolve(true);
    });
    this._deferred.features.promise.then(dojo.hitch(this, '_setGlobalStats'));

    return all([this._deferred.stats, this._deferred.features]);
},

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


getFeatures: function( query, featCallback, doneCallback, errorCallback ) {
    var thisB = this;
    thisB._deferred.features.promise.then(function() {

        var filteredFeats = array.filter(thisB.featureArray, function(item) {
                return item.get('start') < query.end && item.get('end') >= query.start;
            });
        var filteredSpans = array.filter(thisB.spans, function(item) {
                return item.start < query.end && item.end >= query.start;
            });

        thisB.finish(filteredFeats, filteredSpans, featCallback, doneCallback);
    });

},

createFeatures: function(spans) {
    var features = [];
    //Validate this next time...
    for(var span in spans) {
        var id = "comfeat_" + spans[span].start + "." + spans[span].end + "." + spans[span].strand;
        features.push(new SimpleFeature({data: {start: spans[span].start, end: spans[span].end, strand: spans[span].strand}, id: id}));
    }
    return features;
},

evalTree: function(featureArrays, tree, query) {
    if(!tree) return false;
    if(tree.isLeaf()) return this.toSpan(featureArrays[tree.get().name], query);  
    if(!tree.hasLeft()) return this.toSpan(featureArrays[tree.right().get().name], query);  
    if(!tree.hasRight()) return this.toSpan(featureArrays[tree.left().get().name], query);
    return this.opSpan(
                        tree.get(), 
                        this.evalTree(featureArrays, tree.left(), query), 
                        this.evalTree(featureArrays, tree.right(), query), 
                        query
                    );
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
                                                return item.strand == strand;
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
},

finish: function( features, spans, featCallback, doneCallback ) {
    /* Pass features to the track's original featCallback, and pass spans to the doneCallback.
     */
    for ( var key in features ) {
            if ( features.hasOwnProperty(key) ) {
                featCallback( features[key] );
            }
    }
    doneCallback( { spans: spans} );
},



});
});