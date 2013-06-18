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


// Plagiarized from Store/SeqFeature/Bigwig/RequestWorker to create BigWig features
var gettable = declare( null, {
    get: function(name) {
        return this[ { start: 'min', end: 'max', seq_id: 'segment' }[name] || name ];
    },
    tags: function() {
        return ['start','end','seq_id','score','type','source'];
    }
});
var Feature = declare( gettable, {} );

return declare([SeqFeatureStore, DeferredStatsMixin], {

constructor: function( args ) {

    this.isCombinationStore = true;

    // can pass store objects in as args
    this.defaultOp = args.op || "+";
    this.ref = this.config.refSeq;
    
    if(args.opTree) this.reload(args.opTree);
    
    // This code has been stripped of the store promises, since I'm pretty sure we don't need them anymore.
    // If we do, we'll have to go back to a previous commit to find it.

},

reload: function( optree, refSeq, defaultOp) {
    this._deferred.features = new Deferred();
    this._deferred.stats = new Deferred();

    if( !defaultOp) defaultOp = this.defaultOp;
    if( !optree) optree = new TreeNode({ Value: this.defaultOp});;
    if( !refSeq) refSeq = this.ref;
    
    this.opTree = optree;
    this.stores = optree.getLeaves() || [];

    for(var store in this.stores) if(!this.stores[store].name) this.stores = [];
    var thisB = this;
    
    thisB._deferred.features = new Deferred();
    this._deferred.stats = new Deferred();

    // check if there are stores
    if (!Keys(thisB.stores).length) {
        //thisB._deferred.features.reject(" No stores were loaded.");
    }

    var featureArrays = {};

    var globalQuery =   {
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
                globalQuery,
                dojo.hitch( this, function( feature ) {
                    var feat = new featureWrapper( feature, store.name );
                    featureArrays[store.name].push( feat );
                }),
                function(){d.resolve( featureArrays[store.name] );},
                function(){d.reject("Error fetching features for store " + store.name);}
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
    this._deferred.features.then(dojo.hitch(this, function() {
        thisB._regionStatsCache = undefined;
        thisB._getRegionStats(globalQuery, 
            function(stats) {
                thisB.globalStats = stats;
                thisB._deferred.stats.resolve(true);
            }, 
            function() {
                thisB._deferred.stats.reject("Failed to load global stats");
            });

    }));
    return all([this._deferred.stats, this._deferred.features]);
},


applyOp: function(scoreA, scoreB, op) {
    var retValue;
    switch(op) {
        case "+":
            retValue = scoreA + scoreB;
            break;
        case "-":
            retValue = scoreA - scoreB;
            break;
        case "*":
            retValue = scoreA * scoreB;
            break;
        case "/":
            retValue = (scoreB == 0) ? undefined : scoreA/scoreB;
            break;
        default:
            console.error("invalid operation");
            return undefined;
    }
    return retValue;
},
// Inherits getGlobalStats and getRegionStats from the superclasses.  
// If we want any region stats or any global stats other than featureCount and featureDensity,
// We'll have to add them into this file later.
// Regional stats would be added by combining the "score" features of the underlying stores and
// using the combined data to create a "score" feature for each of the features in this.featureArray.


getFeatures: function( query, featCallback, doneCallback, errorCallback ) {
    var thisB = this;
    thisB._deferred.features.then(function() {
        // use 'max' and 'min' instead.
        var filteredFeats = array.filter(thisB.featureArray, function(item) {
                return item.get('min') < query.end && item.get('max') >= query.start;
            });
        var filteredSpans = array.filter(thisB.spans, function(item) {
                return item.start < query.end && item.end >= query.start;
            });
        thisB.finish(filteredFeats, filteredSpans, featCallback, doneCallback);
    });

},

// Alter for quantitative features
createFeatures: function(spans) {
    var features = [];
    //Validate this next time...
    for(var span in spans) {
        var id = "comfeat_" + spans[span].start + "." + spans[span].end + "." + spans[span].strand;
        var f = new Feature();
        f.min = spans[span].min;
        f.max = spans[span].max;
        f.score = spans[span].score;
        if(spans[span].segment) f.segment = spans[span].segment;
        if(spans[span].type) f.type = spans[span].type;
        f.source = this.name;

        features.push(f);
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
opSpan: function(op, pseudosA, pseudosB, query) {
    var retPseudos = [];
    var i = 0;
    var j = 0;
    
    var nextCritical = Math.min(pseudosA[i].min, pseudosB[j].min);
    
    var inA;
    var inB;

    var noInfinite = 0;
    while(i < pseudosA.length && j < pseudosB.length && noInfinite < 3000) {
        if(nextCritical == pseudosA[i].min) inA = true;
        if(nextCritical == pseudosB[j].min) inB = true;
        //noInfinite++;
        var addPseudo = inA || inB;
        // If we're inside at least one pseudo-feature, adds data for the current feature.
        if(addPseudo) {
            var newPseudo = 
            {
                min: nextCritical,
                score: this.applyOp(inA ? pseudosA[i].score : 0, inB ? pseudosB[j].score : 0, op)
            };
            if(inA != inB || pseudosA[i].segment == pseudosB[j].segment) {
                newPseudo.segment = inA ? pseudosA[i].segment : pseudosB[j].segment;
            }
            if(inA != inB || pseudosA[i].type == pseudosB[j].type) {
                newPseudo.type = inA ? pseudosA[i].type : pseudosB[j].type;
            }
        }
        // Dividing by zero or other invalid operation being performed, don't add the feature
        if(newPseudo.score === undefined) addPseudo = false;

        // Fetches the next critical point (the next base pair greater than the current nextCritical value
        //    that is either the beginning or the end of a pseudo)
        var _possibleCriticals = [pseudosA[i].min, pseudosA[i].max, pseudosB[j].min, pseudosB[j].max];
        _possibleCriticals = array.filter(_possibleCriticals, function(item) {
            return (item > nextCritical);
        }).sort(function(a,b){ return a-b;});
        nextCritical = _possibleCriticals[0];
        if(!nextCritical) break;
        
        // Determines whether the next pseudo to be created will use data from pseudosA or pseudosB or both
        if(nextCritical == pseudosA[i].max) {
            inA = false;
            i++;
        }
        if(nextCritical == pseudosB[j].max) {
            inB = false;
            j++;
        }


        // If there is currently a pseudo-feature being built, adds it
        if(addPseudo) {
            newPseudo.max = nextCritical;
            
            retPseudos.push(newPseudo);
        }
    }

    // If some pseudofeatures remain in either pseudo set, they are pushed as is into the return pseudo set.
    for(; i < pseudosA.length; i++) {
        retPseudos.push({
            min: Math.max(nextCritical, pseudosA[i].min),
            max: pseudosA[i].max,
            score: pseudosA[i].score,
            segment: pseudosA[i].segment,
            type: pseudosA[i].type
        });
    }
    for(; j < pseudosB.length; j++) {
        retPseudos.push({
            min: Math.max(nextCritical, pseudosB[j].min),
            max: pseudosB[j].max,
            score: pseudosB[j].score,
            segment: pseudosB[j].segment,
            type: pseudosB[j].type
        });
    }
    return retPseudos;
},

/* notes for this section: 
        -A span object contains a "start" and "end". 
        -The variables "features" and "feature" are often
         pseudo-features (span objects with endpoints that match real features)
*/


toSpan: function(features, query) {
    // given a set of features, creates a set of pseudo-features with similar properties.
    var pseudos = [];
    for(var feature in features) {
        var pseudo =    
        {
            min: features[feature].get('min'),
            max: features[feature].get('max'),
            score: features[feature].get('score'),
            segment: features[feature].get('segment'),
            type: features[feature].get('type')
        };
        pseudos.push(pseudo);
    }
    return pseudos;
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