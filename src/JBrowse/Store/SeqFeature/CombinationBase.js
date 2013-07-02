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
// Helper object that wraps a feature and which store it comes from
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

return declare([SeqFeatureStore, DeferredStatsMixin], {

// The base class for combination stores.  A combination store is one that pulls feature data from other stores
// and combines it according to a binary tree of operations in order to produce new features.

constructor: function( args ) {

    // Objects can access this to know if a given store is a combination store of some kind
    this.isCombinationStore = true;

    this.defaultOp = args.op;
    this.ref = this.config.refSeq;
    
    // If constructed with an opTree already included, might as well try to get all the store info from that opTree.
    if(args.opTree) {
        this.reload(args.opTree);
    }

},

// Loads an operation tree (opTree) and gets all features from all stores.  This constructs an array of features that can be
// easily filtered and returned when getFeatures are called.

// The downside of this approach (e.g. global feature-loading) is it may slow things down substantially for large reference sequences.
reload: function( optree ) {
    this._deferred.features = new Deferred();
    this._deferred.stats = new Deferred();
    var refSeq;

    // Load in opTree
    if( !optree) {
        optree = new TreeNode({ Value: this.defaultOp});
    }
    if( !refSeq) {
        refSeq = this.ref;
    }
    this.opTree = optree;
    this.stores = optree.getLeaves() || [];

    // If any of the stores doesn't have a name, then something weird is happening...
    for(var store in this.stores) {
        if(!this.stores[store].name) {
            this.stores = [];
        }
    }
    var thisB = this;

    // featureArrays will be a map from the names of the stores to an array of each store's features
    var featureArrays = {};

    this.globalQuery =   {
                            ref: refSeq.name,
                            start: refSeq.start,
                            end: refSeq.end
                        };
    // Generate map
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
    
    // Once we have all features, combine them according to the operation tree and create new features based on them.
    when( all( fetchAllFeatures ), function() {
        // Create a set of spans based on the evaluation of the operation tree
        thisB.spans = thisB.evalTree(featureArrays, thisB.opTree, thisB.globalQuery);
        thisB.featureArray = thisB.createFeatures(thisB.spans);
        thisB._deferred.features.resolve(true);
    });
    // Set global stats once we have all features.
    this._deferred.features.promise.then(dojo.hitch(this, '_setGlobalStats'));

    return all([this._deferred.stats, this._deferred.features]);
},

// Filters the featureArrays to return the list of features for the query, and then calls finish() to pass to the callback
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

// Evaluate (recursively) an operation tree to create a list of spans (essentially pseudo-features)
evalTree: function(featureArrays, tree, query) {
    if(!tree) {
        return false;
    } else if(tree.isLeaf()) {
        return this.toSpan(featureArrays[tree.get().name], query);
    } else if(!tree.hasLeft()) {
        return this.toSpan(featureArrays[tree.right().get().name], query);  
    } else if(!tree.hasRight()) {
        return this.toSpan(featureArrays[tree.left().get().name], query);
    }
    return this.opSpan(
                        tree.get(), 
                        this.evalTree(featureArrays, tree.left(), query), 
                        this.evalTree(featureArrays, tree.right(), query), 
                        query
                    );
},

// Passes the list of combined features to the getFeatures() callbacks
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

// Converts a list of spans into a list of features.
createFeatures: function(spans) {},

// Sets the global stats once all features are loaded.
_setGlobalStats: function() {},

// Transforms a set of features into a set of spans
toSpan: function(features, query) {},

// Defines the various operations that may occur and assigns each to a span-making function.
opSpan: function(op, span1, span2, query) {}

});
});