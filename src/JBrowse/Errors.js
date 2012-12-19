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
        dojo.mixin( this, args );
    }
});

var Errors = {};

/**
 *  Generic Error regarding a track.  Needs a `track` in the constructor.
 */
Errors.TrackError = declare( Base, {
    toString: function() {
	return 'Error displaying '+this.track.name+' track' + this.message ? ' '+this.message : '.';
    }
});

/**
 * Error regarding a specific block in a track.
 * Needs `track`, `block`, `blockIndex`.
 */
Errors.TrackBlockError = declare( Errors.TrackError, {} );

/**
 * Timed out when trying to display a certain block in a track.
 * Needs `track`, `block`, `blockIndex`.
 */
Errors.TrackBlockTimeout = declare( Errors.TrackBlockError, {
        constructor: function( args ) {
            this.message = args.message || 'Timed out';
        }
});

return Errors;
});