define( [ 'dojo/_base/declare'],
        function( declare ) {

return declare( null,

/**
 * @lends JBrowse.Store.prototype
 */
{
    /**
     * Base class for all JBrowse data stores.
     * @constructs
     */
    constructor: function( args ) {
        this.refSeq = dojo.clone( args.refSeq );
        this.changeCallback = args.changeCallback || function() {};
        this.browser = args.browser;
    },

    notifyChanged: function( changeDescription ) {
        this.changeCallback( changeDescription );
    },

    /**
     * If this store has any internal deferreds, resolves them all
     * with the given error.
     */
    _failAllDeferred: function( error ) {
        var deferreds = this._deferred || {};
        for( var dname in deferreds ) {
            if( deferreds.hasOwnProperty( dname ) ) {
                deferreds[dname].resolve({ success: false, error: error });
            }
        }
    }


});
});