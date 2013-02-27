define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/Deferred',
           'dojo/when',
           'dojo/promise/all',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Model/SimpleFeature'
       ],
       function(
           declare,
           array,
           Deferred,
           when,
           all,
           SeqFeatureStore,
           SimpleFeature
       ) {

return declare([SeqFeatureStore], {

constructor: function( args ) {

    // can pass store objects in as args
    this.stores = args.stores || { display: [],
                                   mask   : [],
                                   invMask: [] };
    var thisB = this;
    var allStorePromises = {};
    // get objects for any store names provided in the config
    for( var key in thisB.stores ) {
        var storeFetchPromises = (function( key ){
            var storeFetchPromises = array.map(
                thisB.config.storeNames[key] || [],
                function( storeName ) {
                    var d = new Deferred();
                    thisB.browser.getStore( storeName, function( store ) {
                        if( store ) {
                            store.name = storeName;
                            thisB.stores[key].push( store );
                            d.resolve( store, true );
                        }
                        else { // store not found
                            d.reject( 'store '+storeName+' not found', true );
                        }
                    });
                    return d.promise;
            });
            return storeFetchPromises;
        })( key );
        allStorePromises[key] = all( storeFetchPromises )
    }

    this.gotAllStores = all( allStorePromises );
},

getRegionStats: function( region, successCallback, errorCallback ) {
    thisB = this;
    thisB.gotAllStores.then( function() {
        var statObjects = [];
        for (var key in thisB.stores.display) {
        if (thisB.stores.display.hasOwnProperty(key) ) {
            // loop through the stores to be displayed and gather their regional stats
            (function(){
            var stats = thisB.stores.display[key];
            var d = new Deferred();
            statObjects.push(d);
            stats.getRegionStats(region, function(s){d.resolve(s, true);}, errorCallback);
            }());
        }}
        all(statObjects).then( function( args ) {
            // do stat combining here.
            var stats = {};
            // some stats may be related. tempStats provides a buffer between calculations.
            var tempStat = {};
            for (var key in args) {
            if (args.hasOwnProperty(key)) {
                for (var stat in args[key]) {
                if (args[key].hasOwnProperty(stat)) {
                    if (!tempStat[stat]) { tempStat[stat] = args[key][stat]; }
                    else {
                        tempStat[stat] = thisB.combineStats( stat, stats, args[key] );
                    }
                }}
                for (var stat in tempStat) {
                if (tempStat.hasOwnProperty(stat)) {
                    stats[stat] = tempStat[stat];
                }}
            }}
            successCallback(stats);
        });
    });
},

getFeatures: function( query, featCallback, doneCallback, errorCallback ) {
    var thisB = this;

    if (!thisB.config.booleanOP) {
        thisB.config.booleanOP = "AND";
    }
    thisB.gotAllStores.then( function( args ) {

        // check if there are stores
        if (!Object.keys(args).length) {errorCallback}

        var featureArrays = { display: {},
                              mask   : {},
                              invMask: {} };

        var wrapperPromise = [];
        for (var set in featureArrays ) {
        if ( featureArrays.hasOwnProperty(set) ) {
            var fetchAllFeatures = args[set].map(
                function (store) {
                    var s = set;
                    var d = new Deferred();
                    if ( !featureArrays[set][store.name] ) {
                        featureArrays[set][store.name] = [];
                    }
                    store.getFeatures(
                    	query,
                        dojo.hitch( this, function( feature ) {
                            featureArrays[s][store.name].push( feature );
                        }),
                        function(){ d.resolve( featureArrays[s][store.name] );},
                        errorCallback
                    )
                    return d.promise;
                }
            );
            if ( fetchAllFeatures.length != 0 ) {
                wrapperPromise.push( all(fetchAllFeatures) );
            }
        }}
        when( all( wrapperPromise ), function() {
            // reduce the display, mask, and invMask objects into arrays
            var masks = [];
            for ( var feats in featureArrays.mask ) {
                masks = thisB.orSpan( masks, thisB.toSpan( featureArrays.mask[feats] ) );
            }
            masks = thisB.notSpan( masks, query );
            var invMasks = [];
            for ( var feats in featureArrays.invMask ) {
                invMasks = thisB.orSpan( invMasks, thisB.toSpan( featureArrays.invMask[feats] ) );
            }
            var features = [];
            for ( var feats in featureArrays.display ) {
                features = features.concat( featureArrays.display[feats] );
            }
            // tests to determine display behaviour
            // can this be made more succinct?
            if ( !(Object.keys(featureArrays.mask).length + Object.keys(featureArrays.invMask).length) ) {
                thisB.inverseMask( features, [{ start: 0, end: Number.POSITIVE_INFINITY }] , featCallback, doneCallback );
                return; }
            if ( !Object.keys(featureArrays.mask).length ) {
                thisB.inverseMask( features, invMasks, featCallback, doneCallback );
                return; }
            if ( !Object.keys(featureArrays.invMask).length ) {
                thisB.inverseMask( features, masks, featCallback, doneCallback );
                return; }

            switch (thisB.config.booleanOP) {
                case "OR" :
                    thisB.inverseMask( features, thisB.orSpan( masks, invMasks ), featCallback, doneCallback );
                    break;
                case "AND" :
                    thisB.inverseMask( features, thisB.andSpan( masks, invMasks ), featCallback, doneCallback );
                    break;
                default :
                    console.error("Invalid boolean operation: "+this.config.booleanOP);
                    break;
            }
        });
    });
},

/* notes for this section: 
        -A span object contains a "start" and "end". 
        -The variables "features" and "feature" are often pseudo-features (span objects with endpoints that match real features)
*/

makeSpan: function( args ) {
    // given a list of pseudo-features, outputs a list of non-overlapping spans
    var features = args.features || [];
    var spans = args.spans || [];
    if ( features.length == 0 ) { return spans; }
    // if the span is empty, the function does nothing
    if( spans.length == 0 ) {
        spans.push({ start: features[0].start, end: features[0].end });
        features.splice(0,1);
        if ( features.length == 0 ) { return spans; }
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
    }}
    spans.push( { start: features[0].start, end: features[0].end } );
    features.splice(0,1);
    return this.makeSpan({features: features, spans: spans});
},

inSpan: function( feature, span ) {
    // given a feature or pseudo-feature, returns true if the feature overlaps the span. False otherwise.
    if ( !feature || !span ) {console.error("invalide arguments");}
    return feature.get ? !( feature.get('start') >= span.end || feature.get('end') <= span.start ) :
                         !( feature.start >= span.end || feature.end <= span.start );
    
},

toSpan: function( features ) {
    // given a set of features, makes a set of span objects with the same start and end points (a.k.a. pseudo-features)
    var spans = [];
    for (var feature in features) {
    if (features.hasOwnProperty(feature)) {
        spans.push( { start: features[feature].get('start'), end: features[feature].get('end') } );
    }}
    return spans;
},

addOverlap: function( args ) {
    // takes a simple feature and a span, adds the overlap of the two as a property of the feature.
    var feature = args.feature;
    var span = args.span;
    if (!feature) {console.error("addOverlap must be passed a feature. Passed :" + feature); return;}
    if (!feature.overlaps) { feature.overlaps = []; }
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
    }}
    arr.sort( function( a, b ) { return a[1]-b[1]; } );
    var newSpans = [];
    var startNumber = 0;
    for ( var i=0; i<arr.length-1; i++) {
    if (arr[i][0] == 's') { startNumber++; }
    if (arr[i][0] == 'e') { startNumber--; }
    if ( startNumber == 2 ) {
        newSpans.push({ start: arr[i][1], end: arr[i+1][1] });
    }}
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
    }}
    invSpan[i].end = query.end;
    return invSpan;
},

inverseMask: function( features, spans, featCallback, doneCallback ) {
    /* Features from the display set are shown if they are contained in the spans of the masking set.
     * Features partially contained in the spans are displayed.*/
     // change function description. The implementation has changed.
    var thisB = this;
    for ( var key in features ) {
    if ( features.hasOwnProperty(key) ) {
        featCallback( features[key] )
    }}
    doneCallback( spans );
},

combineStats: function( key, currStats, newStats) {
    /* This block, called by getRegionStats, decides how to combine region statistics from different stores.
       currStats is an object containing the combined stats of stores processed thusfar.
       newStats is an object containing the new stats from a store in the process of being merged.
       the two variables defined below - currStat and newStat - are the individual fields under consideration, as specified by "key"
       Depending on the field, other statistics may be required to compute the combination

       If you've encountered the default case, this means that the track you constructed does not know how to handle the
       track statistics. Please add cases as required.
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
            return Math.min( currStat, newStat );
        case 'scoreMax':
            return Math.max( currStat, newStat );
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
            if (n > 1) { variance /= n-1; }
            return variance < 0 ? 0 : Math.sqrt(variance);
        default:
            console.error("No stat combination behaviour defined for "+key);
    }
}

});
});