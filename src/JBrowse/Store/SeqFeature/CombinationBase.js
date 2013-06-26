define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/Deferred',
           'dojo/when',
           'dojo/promise/all',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredStatsMixin',
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
    this.defaultOp = args.op;
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

    this.globalQuery =   {
                            ref: refSeq.name,
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
                thisB.globalQuery,
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
        thisB.spans = thisB.evalTree(featureArrays, thisB.opTree, this.globalQuery);
        thisB.featureArray = thisB.createFeatures(thisB.spans);
        thisB._deferred.features.resolve(true);
    });
    this._deferred.features.promise.then(dojo.hitch(this, '_setGlobalStats'));

    return all([this._deferred.stats, this._deferred.features]);
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

// These last four functions are stubbed out because each derived class should have its own implementation of them.

createFeatures: function(spans) {},

_setGlobalStats: function() {},

    // given a set of features, takes the "union" of them and outputs a single set of nonoverlapping spans
    // This function is a stub since it should be implemented separately in each derived class
toSpan: function(features, query) {},

// Defines the various operations that may occur and assigns each to a span-making function.
opSpan: function(op, span1, span2, query) {}

/* notes for this section: 
        -A span object is essentially a simplified feature, containing much of the same data.
*/

});
});