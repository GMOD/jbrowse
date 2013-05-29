define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/Deferred',
           'dojo/when',
           'dojo/promise/all',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Model/SimpleFeature',
           'JBrowse/Util'
       ],
       function(
           declare,
           array,
           Deferred,
           when,
           all,
           SeqFeatureStore,
           SimpleFeature,
           Util
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

return declare([SeqFeatureStore], {

constructor: function( args ) {

    // can pass store objects in as args
    this.defaultOp = args.op || "AND";
    this.opTree = args.opTree || new TreeNode({ Value: this.defaultOp});
    this.stores = this.opTree.getLeaves() || [];

    var thisB = this;
    
    // Push resolved promises for all stores passed into this object
    var allStorePromises = [];
    for(var store in this.stores) {
        var d = new Deferred();
        if(this.stores[store]) d.resolve(this.stores[store], true);
        else d.reject("Store not found", true);
        allStorePromises.push(d.promise);
    }

    // Push promises for all stores whose names have been passed into this object's config file - don't know if necessary
    var storeFetchPromises = (function(){
        var storeFetchPromises = array.map(
            thisB.config.storeNames || [],
            function( storeName ) {
                var d = new Deferred();
                var index = thisB.stores.indexOf(storeName);
                if(index != -1) {
                    d.resolve( thisB.stores[index], true );
                } else {
                    thisB.browser.getStore( storeName, function( store ) {
                        if ( store ) {
                            store.name = storeName;
                            thisB.stores.push( store );

                            // Constructs operation tree from store names using default set operation.
                            // Creates a left-heavy tree... possible tree-balancing to improve efficiency?
                            var tn = new TreeNode({Value: store});
                            if(!(this.opTree.add( tn ))) {
                                var opNode = new TreeNode({Value: this.defaultOp});
                                opNode.add(this.opTree);
                                opNode.add(tn);
                                this.opTree = opNode;
                            }

                            d.resolve( store, true );
                        }
                        else { // store not found
                            d.reject( 'store '+storeName+' not found', true );
                        }
                    });
                }
                return d.promise;
        });
        return storeFetchPromises;
    })();
    allStorePromises = allStorePromises.concat(storeFetchPromises);
    this.gotAllStores = all(allStorePromises);
},

// Will need to figure this one out later.
getGlobalStats: function( successCallback, errorCallback ) {
    thisB = this;
    thisB.gotAllStores.then( function() {
        var statObjects = [];
        for (var key in thisB.stores.display) {
            if (thisB.stores.display.hasOwnProperty(key) ) {
                // loop through the stores to be displayed and gather their regional stats
                (function(){
                var stats = thisB.stores.display[key];
                var d = new Deferred();
                statObjects.push(d.promise);
                stats.getGlobalStats(function(s){d.resolve(s, true);}, errorCallback);
                }());
            }
        }
        all(statObjects).then( function( args ) {
            // do stat combining here.
            var stats = {};
            // some stats may be related. tempStats provides a buffer between calculations.
            var tempStat = {};
            for (var key in args) {
                if (args.hasOwnProperty(key)) {
                    for (var stat in args[key]) {
                        if (args[key].hasOwnProperty(stat)) {
                            if (!tempStat[stat]) { 
                                tempStat[stat] = args[key][stat];
                            }
                            else {
                                tempStat[stat] = thisB.combineStats( stat, stats, args[key] );
                            }
                        }
                    }
                    for (var stat in tempStat) {
                        if (tempStat.hasOwnProperty(stat)) {
                            stats[stat] = tempStat[stat];
                        }
                    }
                }
            }
            successCallback(stats);
        });
    });
},

// Will need to figure this one out later as well.
getRegionalStats: function( region, successCallback, errorCallback ) {
    this.getGlobalStats( successCallbback, errorCallback );
},

getFeatures: function( query, featCallback, doneCallback, errorCallback ) {
    var thisB = this;
    
    thisB.gotAllStores.then( function( args ) {
        // check if there are stores
        if (!Keys(args).length) {
            errorCallback;
        }

        var featureArrays = {};

        var wrapperPromise = [];
        var fetchAllFeatures = args.map(
            function (store) {
                var d = new Deferred();
                if ( !featureArrays[store.name] ) {
                    featureArrays[store.name] = [];
                }
                store.getFeatures(
                    query,
                    dojo.hitch( this, function( feature ) {
                        var feat = new featureWrapper( feature, store.name );
                        featureArrays[store.name].push( feat );
                    }),
                    function(){d.resolve( featureArrays[store.name] );},
                    errorCallback
                );
                return d.promise;
            }
        );

        // May need to reconsider this since removing invMask, Mask and display might have screwed it all up
        if ( fetchAllFeatures.length != 0 ) {
            wrapperPromise.push( all(fetchAllFeatures) );
        }
        
        when( all( wrapperPromise ), function() {
            // Create a set of spans based on the evaluation of the operation tree

            var spans = thisB.evalTree(featureArrays, thisB.opTree, query);
            
            thisB.finish(featureArrays, spans, featCallback, doneCallback);

        });
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


// Defines the various set-theoretic operations that may occur and assigns each to a span-making function.
opSpan: function(op, span1, span2, query) {
    switch (op) {
        case "AND" :
            return this.andSpan(span1, span2);
            break;
        case "OR" :
            return this.orSpan(span1, span2);
            break;
        case "XOR" :
            return this.andSpan(this.orSpan(span1, span2), this.notSpan(this.andSpan(span1, span2), query));
            break;
        case "MINUS" :
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

makeSpan: function( args ) {
    // given a list of pseudo-features, outputs a list of non-overlapping spans
    var features = args.features || [];
    var spans = args.spans || [];
    if ( features.length == 0 ) { 
        return spans.sort( function( a, b ) { return a.start-b.start } );
    }
    // if the span is empty, the function does nothing
    if( spans.length == 0 ) {
        spans.push({ start: features[0].start, end: features[0].end });
        features.splice(0,1);
        if ( features.length == 0 ) {
            return spans.sort ( function ( a, b ) { return a.start-b.start } );
        }
    }
    for (var span in spans) {
        if (spans.hasOwnProperty(span)) {
            span = spans[span];
            if ( this.inSpan( features[0], span ) ) {
                features[0].start = Math.min( features[0].start, span.start );
                features[0].end = Math.max( features[0].end, span.end );
                spans.splice( spans.indexOf(span), 1 );
                return this.makeSpan({features: features, spans: spans});
            }
        }
    }
    spans.push( { start: features[0].start, end: features[0].end } );
    features.splice(0,1);
    return this.makeSpan({features: features, spans: spans});
},

inSpan: function( feature, span ) {
    // given a feature or pseudo-feature, returns true if the feature
    // overlaps the span. False otherwise.
    if ( !feature || !span ) {
        console.error("invalid arguments");
    }
    return feature.get ? !( feature.get('start') >= span.end || feature.get('end') <= span.start ) :
                         !( feature.start >= span.end || feature.end <= span.start );
    
},

toSpan: function( features, query ) {
    // given a set of features, makes a set of span objects with the
    // same start and end points (a.k.a. pseudo-features)
    var spans = [];
    for (var feature in features) {
        if (features.hasOwnProperty(feature)) {
            spans.push( { start: Math.max( features[feature].get('start'), query.start ), 
                          end:   Math.min( features[feature].get('end'),   query.end   ) } );
        }
    }
    return spans;
},

addOverlap: function( args ) {
    // takes a simple feature and a span, adds the overlap of the two
    // as a property of the feature.
    var feature = args.feature;
    var span = args.span;
    if (!feature) {
        console.error("addOverlap must be passed a feature. Passed :" + feature);
        return;
    }
    if (!feature.overlaps) {
        feature.overlaps = [];
    }
    feature.overlaps.push( { start: Math.max( feature.get('start'), span.start ),
                             end:   Math.min( feature.get('end'), span.end ) } );
    return feature;
},

orSpan: function( span1, span2 ){
    // given two sets of spans, outputs a set corresponding to their union.
    return this.makeSpan({ features: span1.concat( span2 ) });
},

andSpan: function( span1, span2 ) {
    // given two sets of spans, outputs a set corresponding to their intersection.
    var spans = span1.concat(span2);
    var arr = [];
    for ( key in spans ) {
        if ( spans.hasOwnProperty(key) ) {
            arr.push(['s', spans[key].start]);
            arr.push(['e', spans[key].end]);
        }
    }
    arr.sort( function( a, b ) { return a[1]-b[1]; } );
    var newSpans = [];
    var startNumber = 0;
    for ( var i=0; i<arr.length-1; i++) {
        if (arr[i][0] == 's') {
            startNumber++;
        }
        if (arr[i][0] == 'e') {
            startNumber--;
        }
        if ( startNumber == 2 ) {
            newSpans.push({ start: arr[i][1], end: arr[i+1][1] });
        }
    }
    return newSpans;
},

notSpan: function( spans, query ) {
    // creates the compliment spans of the input spans
    var invSpan = [];
    invSpan[0] = { start: query.start };
    var i = 0;
    for (span in spans) {
        if (spans.hasOwnProperty(span)) {
            span = spans[span];
            invSpan[i].end = span.start;
            i++;
            invSpan[i] = { start: span.end };
        }
    }
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
    for ( var storeName in features ) {
        for (var key in features[storeName])
            if ( features[storeName].hasOwnProperty(key) ) {
                featCallback( features[storeName][key] );
            }
    }
    doneCallback( { spans: spans} );
},

// ALTER THIS LATER
combineStats: function( key, currStats, newStats) {
    /* This block, called by getRegionStats, decides how to combine region
       statistics from different stores. CurrStats is an object containing 
       the combined stats of stores processed thusfar.
       newStats is an object containing the new stats from a store in the 
       process of being merged. The two variables defined below - currStat
       and newStat - are the individual fields under consideration, as 
       specified by "key". Depending on the field, other statistics may be
       required to compute the combination

       If you've encountered the default case, this means that the track 
       you constructed does not know how to handle the track statistics. 
       Please add cases as required.
    */
    var currStat = currStats[key];
    var newStat = newStats[key];
    switch (key) {
        case 'featureDensity':
            return currStat + newStat;
        case 'featureCount':
            return currStat + newStat;
        /*
            BAM type tracks
        */
        case '_statsSampleFeatures':
            return currStat + newStat;
        case '_statsSampleInterval':
            // no combination should be necessary
            return newStat;
        /*
            wiggle type tracks 
        */
        case 'basesCovered':
            return currStat + newStat;
        case 'scoreMin':
            return currStat + newStat;
        case 'scoreMax':
            /* note: this might overestimate the maxmimu score.
             * If the two maximums are in different regions, they will not add */
            return currStat + newStat;
        case 'scoreSum':
            return currStat + newStat;
        case 'scoreSumSquares':
            return currStat + newStat;
        case 'scoreMean':
            // note: assumes other properties will be available
            return ((currStats['basesCovered'])*currStat + (newStats['basesCovered']*newStat))/currStats['basesCovered'];
        case 'scoreStdDev':
            // note: assumes other properties will be available
            var n = currStats['basesCovered']+newStats['basesCovered'];
            var sumSquares = currStats['scoreSumSquares']+newStats['scoreSumSquares'];
            var squareSums = (currStats['scoreSum']+newStats['scoreSum'])*(currStats['scoreSum']+newStats['scoreSum']);
            var variance = sumSquares - squareSums/n;
            if (n > 1) {
                variance /= n-1;
            }
            return variance < 0 ? 0 : Math.sqrt(variance);
        default:
            console.error("No stat combination behaviour defined for "+key);
    }
}

});
});