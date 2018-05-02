const readTribbleIndex = cjsRequire('tribble-index').default
const Buffer = cjsRequire('buffer').Buffer

define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/Deferred',
           'JBrowse/has',
           'JBrowse/Model/DataView',
           'JBrowse/Util',
       ],
       function(
           declare,
           array,
           Deferred,
           has,
           jDataView,
           Util,
           VirtualOffset
       ) {

return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser;
        this.blob = args.blob;
        this.load();
    },

    load: function() {
        if (!this._loaded) {
            this._loaded = new Deferred()
            this.blob.fetch(
                data => {
                    this.data = readTribbleIndex(Buffer.from(data))
                    this._loaded.resolve()
                },
                err => this._loaded.reject(err),
            )
        }
        return this._loaded
    },

    /**
     * Interrogate whether a store has data for a given reference
     * sequence.  Calls the given callback with either true or false.
     */
    hasRefSeq: function( seqName, callback, errorCallback ) {
        this.load()
            .then(
                () => {
                    callback(this.data.hasRefSeq(seqName))
                },
                errorCallback,
            )
    },

    blocksForRange: function(refName, start, end) {
        return this.data.getBlocks(refName, start, end)
    },
});
});
