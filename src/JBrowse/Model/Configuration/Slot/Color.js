/**
 * Slot that holds an array of zero or more other slots, all of the same type.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/colors',
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
        if( value === undefined )
            return value;
        if(!( value instanceof Color ))
            value = new Color( value );
        if( ! value.deflate )
            value.deflate = function() {
                return { $class: 'dojo/colors',
                         a: this.a,
                         b: this.b,
                         g: this.g,
                         r: this.r
                       };
            };

        return value;
    }

});
});