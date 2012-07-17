define( [ 'dojo/_base/declare'],
        function( declare ) {

return declare(null,

/**
 * @lends JBrowse.Store.prototype
 */
{
    /**
     * Base class for all JBrowse data stores.
     * @constructs
     */
    constructor: function( args ) {
    },

    loadSuccess: function( data, url ) {
    },

    loadFail: function(error) {
        this.empty = true;
        this.setLoaded();
    },

    load: function(url) {
        dojo.xhrGet({ url: url || this.url,
                      handleAs: "json",
                      failOk: true,
                      load:  dojo.hitch( this, function(o) { this.loadSuccess(o, url); }),
                      error: dojo.hitch( this, function(o) { this.loadFail(o, url);    })
	            });
    },

    setLoaded: function() {
        this.loaded = true;
        this.hideAll();
        this.changed();
    },

    hideAll: function() {
    },

    changed: function() {
    }

});
});