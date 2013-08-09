/**
 * Slot that holds an array of zero or more other slots, all of the same type.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/Color',
           '../Slot'
       ],
       function(
           declare,
           lang,
           Color,
           Slot
       ) {
return declare( Slot, {

    normalizeValue: function( value )  {
        return value instanceof Color ? value : new Color( value );
    }

});
});