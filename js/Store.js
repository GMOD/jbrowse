/**
 * Base class for all JBrowse data stores.
 * @class
 */

function Store( args ) {
};

Store.prototype.loadSuccess = function( data, url ) {
};

Store.prototype.loadFail = function(error) {
    this.empty = true;
    this.setLoaded();
};

Store.prototype.load = function(url) {
    var that = this;
    dojo.xhrGet({url: url || this.url,
                 handleAs: "json",
                 load: function(o)  { that.loadSuccess(o, url); },
                 error: function(o) { that.loadFail(o, url); }
	        });
};

Store.prototype.setLoaded = function() {
    this.loaded = true;
    this.hideAll();
    this.changed();
};


Store.prototype.hideAll = function() {
};


Store.prototype.changed = function() {
};
