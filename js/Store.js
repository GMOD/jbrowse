/**
 * Base class for all JBrowse data stores.
 * @class
 */

function Store( args ) {
    if( !args )
        return;

    this.baseUrl = args.baseUrl;
    this.urlTemplate = args.urlTemplate;
};

Store.prototype.loadSuccess = function( data, url ) {
};

Store.prototype.loadFail = function(error) {
    this.empty = true;
    this.setLoaded();
};

Store.prototype.load = function( refSeq ) {
    if( ! refSeq )
        throw "must provide a refseq!";

    this.url = Util.resolveUrl(
                   this.baseUrl,
                   Util.fillTemplate( this.urlTemplate,
                                      {'refseq': refSeq.name } )
               );
    dojo.xhrGet({ url: this.url,
                  handleAs: "json",
                  load:  dojo.hitch( this, function(o) { this.loadSuccess(o, this.url, refSeq ); }),
                  error: dojo.hitch( this, function(o) { console.error(''+e); this.loadFail(o, this.url, refSeq );    })
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
