/**
 * Specifies the slots in a configuration and a variety of metadata
 * about them, such as type, title, description, etc.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/array',
           './Slot'
       ],
       function(
           declare,
           array,
           Slot
       ) {

var slotClasses = {
    // add any custom slot classes here and load them above
};

return declare( null, {

    constructor: function( specDef ) {
        this._slotsByName = {};
        this._slotsList = [];

        this._load( specDef );
    },

    _load: function( spec ) {
        array.forEach( spec.slots || [], function( slotSpec ) {
            var slot = new (this._getSlotClass( slotSpec ))( slotSpec );
            this._slotsByName[ slot.name ] = slot;
            this._slotsList.push( slot );
        },this);
    },

    _getSlotClass: function( slotSpec ) {
        return slotClasses[ slotSpec.type ] || Slot;
    },

    getSlot: function( slotname ) {
        return this._slotsByName[slotname];
    },

    /**
     * Validate and possibly munge the given value before setting.
     * NOTE: Throw an Error object if it's invalid.
     */
    normalizeSetting: function( key, value ) {
        //console.log( 'validating '+key+' '+value );
        var slot = this.getSlot(key);
        if( ! slot )
            throw new Error( 'Unknown configuration key '+key );

        return slot.normalizeValue( value );
    }
});
});