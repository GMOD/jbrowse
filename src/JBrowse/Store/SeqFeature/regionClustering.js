define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/Deferred',
           'dojo/when',
           'dojo/promise/all',
           'JBrowse/Util'
       ],
       function(
           declare,
           array,
           Deferred,
           when,
           all,
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

return declare( null , {

constructor: function( args ) {
    // can pass store objects in as args
    this.stores = args.stores || { display: [] }; //  TODO: trim the display property. {{data}} is confusing: we want {data}.
    this.browser = args.browser;
    var thisB = this;
    // get objects for any store names provided in the config
    var storeFetchPromises = array.map(
        args.storeNames.display || [],
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
}

});
});