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
        this.errorCallback = args.errorCallback || function() {};
        this.browser = args.browser;
    },

    notifyChanged: function( changeDescription ) {
        this.changeCallback( changeDescription );
    },

    notifyError: function( error ) {
        this.errorCallback( error );
        this.error = error;
    }

});
});