define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/Deferred',
           'dojo/when',
           'dojo/promise/all',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Model/SimpleFeature',
           'JBrowse/Store/SeqFeature/Combination/TreeNode',
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
           TreeNode,
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
    this.isCombinationStore = true;
    this.inverse = args.inverse || false;
    this.stores = {};

    if(args.mask && args.display) this.reload(args.mask, args.display);
},

reload: function(opTree, mask, display) {

    this.gotAllStores = new Deferred();
    if(opTree) {
        this.opTree = opTree;
        this.inverse = (inverse == undefined) ? (opTree.get() == "INV_MASK") : inverse;
        this.stores.mask = opTree.leftChild && !mask ? opTree.leftChild.get() : mask;
        this.stores.display = opTree.rightChild && !display ? opTree.rightChild.get() : display;
        this.gotAllStores.resolve(true);
    }
    else {
        if(inverse !== undefined) this.inverse = inverse;
        this.opTree =  new TreeNode({Value: this.inverse ? "INV_MASK" : "MASK"});
        this.stores.mask = mask;
        this.stores.display = display;
        var thisB = this;

        var grabStore = function(store) {
            var haveStore = new Deferred();
            if(typeof store == "string") {
                thisB.browser.getStore(store, function(result) {
                    if(result) {
                        haveStore.resolve(result, true);
                    } else {
                        haveStore.reject("store " + store + " not found");
                    }
                });
            } else {
                haveStore.resolve(store, true);
            }
            return haveStore.promise;
        }

        var haveMaskStore = grabStore(this.stores.mask).then(function(store) { thisB.stores.mask = store; });
        var haveDisplayStore = grabStore(this.stores.display).then(function(store) { thisB.stores.display = store; });
        this.gotAllStores = all([haveMaskStore, haveDisplayStore]);
        this.gotAllStores.then(function() {
            thisB.opTree.leftChild = thisB.stores.mask.isCombinationStore ? thisB.stores.mask.opTree : new TreeNode({Value: thisB.stores.mask});
            thisB.opTree.rightChild = thisB.stores.display.isCombinationStore ? thisB.stores.display.opTree : new TreeNode({Value: thisB.stores.display});
        });
    }
},

getGlobalStats: function (callback, errorCallback) {
    return this.stores.display.getGlobalStats(callback, errorCallback);
},

getRegionStats: function (query, successCallback, errorCallback) {
    return this.stores.display.getRegionStats(query, callback, errorCallback);
},

getFeatures: function( query, featCallback, doneCallback, errorCallback ) {
    var thisB = this;

    this.gotAllStores.then(
        function() {
            //console.log("we have stores");
            var featureArray = {};
            
            var grabFeats = function(key)  {
                //console.log(key);
                var d = new Deferred();
                featureArray[key] = [];
                
                thisB.stores[key].getFeatures(query,
                    function(feature) {
                        featureArray[key].push(feature);
                    },
                    function() { d.resolve(true);
                        //console.log("got features for " + key);
                    },
                    function() { d.reject("failed to load features for " + key+ " store"); }
                );
                return d.promise;
            }
            when(all([grabFeats("mask"), grabFeats("display")]),
                function() {

                    var spans = thisB.toSpans(featureArray.mask, query);
                    spans = thisB.inverse ? thisB.notSpan(spans, query) : spans;
                    var features = featureArray.display;

                    thisB.maskFeatures(features, spans, featCallback, doneCallback);
                }
            );
        });
},

inSpan: function( feature, span ) {
    // given a feature or pseudo-feature, returns true if the feature
    // overlaps the span. False otherwise.
    if ( !feature || !span ) {
        console.error("invalid arguments to inSpan function");
    }
    return feature.get ? !( feature.get('start') >= span.end || feature.get('end') <= span.start ) :
                         !( feature.start >= span.end || feature.end <= span.start );
    
},

maskFeatures: function( features, spans, featCallback, doneCallback ) {
    /* Pass features to the tracks original featCallback, and pass spans to the doneCallback.
     * If the track has boolean support, the DoneCallback will use the spans to mask the features.
     * For glyph based tracks, the masks passed to each feature will be used to do masking.
     */
    for ( var key in features ) {
        if ( features.hasOwnProperty(key) ) {
            var feat = features[key];
            for (var span in spans ) {
                if ( spans.hasOwnProperty(span) && this.inSpan( feat, spans[span] ) ) {
                    // add masks to the feature. Used by Glyphs to do masking.
                    feat.masks = feat.masks ? feat.masks.concat([spans[span]]) : [spans[span]];
                }
            }
            featCallback( features[key] )
        }
    }
    doneCallback( { maskingSpans: spans} );
},

notSpan: function( spans, query ) {
    // creates the complement spans of the input spans
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

toSpans: function(features, query) {
    // given a set of features, takes the "union" of them and outputs a single set of nonoverlapping spans
    var spans = [];
    for (var feature in features) {
        if (features.hasOwnProperty(feature)) {
            spans.push( { start: features[feature].get('start'), //Math.max( features[feature].get('start'), query.start ), 
                          end:   features[feature].get('end') //Math.min( features[feature].get('end'),   query.end   )
                        } );
        }
    }

    if(!spans.length) return [];
    spans.sort(function(a,b) { return a.start - b.start; });

    var retSpans = [];
    var i = 0;
    while(i < spans.length) {
        var start = spans[i].start;
        var end = spans[i].end;
        while(i < spans.length && spans[i].start <= end) {
            end = Math.max(end, spans[i].end);
            i++;
        }
        retSpans.push( { start: start, end: end});
    }
    return retSpans;
    
}



});
});