/**
 * Model for a viewing location that is defined by:
 *    - the name of the coordinate system
 *    - a center coordinate
 *    - a span that defines the size of the viewing region
 *
 * These are much more convenient than ranges when the views are
 * discontinuous.
 */

define([
           'dojo/_base/lang',
           'JBrowse/Util'
       ],
       function(
           lang,
           Util
       ) {
return Util.fastDeclare({
    constructor: function( args ) {
        Util.validate( args, { name: 'string', center: 'number', span: 'number' } );
        lang.mixin( this, args );
    }
});
});