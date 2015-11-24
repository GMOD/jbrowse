define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/has',
            'JBrowse/Util',
            'JBrowse/Errors',
            'JBrowse/Store/LRUCache'
        ],
        function( declare, array, has, Util, Errors, LRUCache ) {

return declare( null,


/**
 * @lends JBrowse.Store.Sequence.IndexedFasta.File
 */
{
    constructor: function( args ) {
        this.store = args.store;
        this.data  = args.data;
        this.bai   = args.fai;

        this.chunkSizeLimit = args.chunkSizeLimit || 500000;
    },

    init: function( args ) {
        var bam = this;
        var successCallback = args.success || function() {};
        var failCallback = args.failure || function(e) { console.error(e, e.stack); };

        this._readFAI( dojo.hitch( this, function() {
            successCallback();
        }), failCallback );
    },

    _readFAI: function( successCallback, failCallback ) {
        // Do we really need to fetch the whole thing? :-(
        this.fai.fetch( dojo.hitch( this, function(header) {
            if (!header) {
                failCallback("No data read from FASTA index (FAI) file");
                return;
            }

            successCallback(  );
        }), failCallback );
    },



});


});
