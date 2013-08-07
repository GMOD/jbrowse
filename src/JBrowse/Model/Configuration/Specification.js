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

    constructor: function( spec ) {
        this._slotsByName = {};
        this._slotsList = [];

        this._load( spec );
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

    validateSetting: function( key, value ) {
        //console.log( 'validating '+key+' '+value );
        var slot = this._slotsByName[key];
        if( ! slot )
            return new Error( 'Unknown configuration key '+key );

        var error = slot.validateValue( value );
        return error || null;
    }
});
});