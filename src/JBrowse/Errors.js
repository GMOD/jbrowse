/**
 * All of the different JBrowse Error objects.  This amounts to a
 * taxonomy of the different errors that JBrowse code can reason
 * about.
 */
define( [
            'dojo/_base/declare',

            'dojo/errors/CancelError'
        ],
        function(
            declare,

            CancelError
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
    },

    deflate: function() {
        return { message: this.message,
                 $class: 'JBrowse/Errors.'+this._class
               };
    }
});

var Errors = {};

Errors.Fatal = declare( Base, {
    _class: 'Fatal',
    _defaultMessage: 'Unknown fatal error.'
});

/**
 * Took too long to handle data.
 */
Errors.TimeOut = declare( Base, {
    _class: 'TimeOut',
    _defaultMessage: 'Data took too long to fetch.'
});

/**
 * Too much data to handle.
 */
Errors.DataOverflow = declare( Base, {
    _class: 'DataOverflow',
    _defaultMessage: 'Too much data to show.'
});

Errors.Cancel = declare( 'JBrowse.Errors.Cancel', [ CancelError, Base ], {
    _class: 'Cancel',
    _defaultMessage: 'Action canceled normally.'
});

Errors.UserCancel = declare( Errors.Cancel, {
    _class: 'UserCancel',
    _defaultMessage: 'Action canceled by the user.'
});

return Errors;
});