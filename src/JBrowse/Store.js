define( [
            'dojo/_base/declare',
            'JBrowse/Component'
        ],
        function(
            declare,
            Component
        ) {

return declare( Component,

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
                deferreds[dname].reject( error );
            }
        }
    }


});
});