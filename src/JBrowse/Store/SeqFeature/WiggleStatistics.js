define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/Deferred',
           'dojo/when',
           'dojo/promise/all',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Util'
       ],
       function(
           declare,
           array,
           Deferred,
           when,
           all,
           SeqFeatureStore,
           Util
       ) {

var featureWrapper = Util.fastDeclare(
    {
        get: function( arg ) { return this.feature.get(arg); },

        id: function() { return this.feature.id()+this.storeName; },

        parent: function() { return this.feature.parent(); },

        children: function() { return this.feature.children(); },

        tags: function() { return this.feature.tags(); },

        constructor: function( feat, storeName ) {
            this.feature = feat;
            this.storeName = storeName;
            this.source = feat.source || undefined;
        }
    });

// DOES NOT WORK YET!... probably.

return declare([SeqFeatureStore], {

constructor: function( args ) {

    // can pass store objects in as args
    this.stores = args.stores || { display: [] }; // trim the display property. {{data}} is confusing: we want {data}.
    var thisB = this;
    // get objects for any store names provided in the config
    var storeFetchPromises = array.map(
        thisB.config.storeNames.display || [],
        function( storeName ) {
            var d = new Deferred();
            thisB.browser.getStore( storeName, function( store ) {
                if ( store ) {
                    store.name = storeName;
                    thisB.stores.display.push( store );
                    d.resolve( store, true );
                }
                else { // store not found
                    d.reject( 'store '+storeName+' not found', true );
                }
            });
            return d.promise;
    });

    this.gotAllStores = all( storeFetchPromises );
},

getFeatures: function( query, featCallback, doneCallback, errorCallback ) {
    var thisB = this;

    thisB.gotAllStores.then( function( args ) {

        // check if there are stores
        if (!Object.keys(args).length) {
            errorCallback
        }

        var featureArrays = { display: {} };

        var wrapperPromise = [];
        var fetchAllFeatures = args.map(
            function (store) {
                var s = 'display';
                var d = new Deferred();
                if ( !featureArrays['display'][store.name] ) {
                    featureArrays['display'][store.name] = [];
                }
                store.getFeatures(
                    query,
                    dojo.hitch( this, function( feature ) {
                        var feat = new featureWrapper( feature, store.name );
                        featureArrays[s][store.name].push( feat );
                    }),
                    function(){ d.resolve( featureArrays[s][store.name] );},
                    errorCallback
                )
                return d.promise;
            }
        );
        when( all( fetchAllFeatures ), function() {
            var features = [];
            for ( var feats in featureArrays.display ) {
                features = features.concat( featureArrays.display[feats] );
            }
            thisB.executeCallbacks( features, featCallback, doneCallback );
        });
    });
},

executeCallbacks: function( features, featCallback, doneCallback ) {
    /* Pass features to the tracks original featCallback, and let the track methods
     * display the features.
     */
    for ( var key in features ) {
        if ( features.hasOwnProperty(key) ) {
            featCallback( features[key] )
        }
    }
    doneCallback();
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
            wiggle type tracks 
        */
        case 'basesCovered':
            return currStat + newStat;
        case 'scoreMin':
            return Math.floor(Math.min(currStat, newStat));
        case 'scoreMax':
            return Math.ceil(Math.max(currStat, newStat));
        case 'scoreSum':
            return currStat + newStat;
        case 'scoreSumSquares':
            return currStat + newStat;
        case 'scoreMean':
            // note: assumes other properties will be available
            return ((currStats['basesCovered'])*currStat + (newStats['basesCovered']*newStat))/(currStats['basesCovered']+newStats['basesCovered']);
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