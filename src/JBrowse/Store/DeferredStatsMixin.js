/**
 * Mixin for a store class that needs to load some remote stuff (or do
 * some other kind of asynchronous thing) before its stats are
 * available through getRegionStats.
 */

define([
           'dojo/_base/declare',
           'dojo/Deferred',
           'JBrowse/Util'
       ],
       function( declare, Deferred, Util ) {

return declare( null, {

    // note that dojo.declare automatically chains constructors
    // without needing inherited()
    constructor: function( args ) {
        if( ! this._deferred )
            this._deferred = {};
        this._deferred.stats = new Deferred();
    },

    getRegionStats: function( query, successCallback, errorCallback ) {
        var thisB = this;
        this._deferred.stats.then(
            dojo.hitch( this, '_getRegionStats', query, successCallback, errorCallback ),
            errorCallback
        );
    }
});

});