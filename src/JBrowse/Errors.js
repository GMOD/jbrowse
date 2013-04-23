/**
 * All of the different JBrowse Error objects.  This amounts to a
 * taxonomy of the different errors that JBrowse code can reason
 * about.
 */
define( [
            'dojo/_base/declare'
        ],
        function(
            declare
        ) {

var Base = declare( Error, {
    constructor: function( args ) {
        if( typeof args == 'object' ) {
            if( args instanceof Error ) {
                this._originalError = args;
                this.message = ''+args;
                this.stack = args.stack;
            }
            else
                dojo.mixin( this, args );
        } else if( typeof args == 'string' )
            this.message = args;

        if( ! this.message )
            this.message = this._defaultMessage;
    }
});

var Errors = {};

Errors.Fatal = declare( Base, {
    _defaultMessage: 'Unknown fatal error.'
});

/**
 * Took too long to handle data.
 */
Errors.TimeOut = declare( Base, {
    _defaultMessage: 'Data took too long to fetch.'
});

/**
 * Too much data to handle.
 */
Errors.DataOverflow = declare( Base, {
    _defaultMessage: 'Too much data to show.'
});


return Errors;
});