/**
 * Specifies the slots in a configuration and a variety of metadata
 * about them, such as type, title, description, etc.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           './Slot',
           './Slot/Multi',
           './Slot/SubConfiguration'
       ],
       function(
           declare,
           array,
           lang,
           Slot,
           MultiSlot,
           SubConfigurationSlot
       ) {

var slotClasses = {
    // add any custom slot classes here and load them above
    'subconfiguration' : SubConfigurationSlot
};

return declare( null, {

    constructor: function( def ) {
        this._slotsByName = {};
        this._slotsList = [];

        this._load( def );
    },

    _load: function( def ) {
        array.forEach( def.slots || [], function( slotSpec ) {
            slotSpec = lang.mixin( { schemaClass: this.constructor._meta.bases[0] }, slotSpec );
            var slot = new (this.getSlotClass( slotSpec ))( slotSpec, this );
            this._slotsByName[ slot.name ] = slot;
            this._slotsList.push( slot );
        },this);
    },

    getSlotClass: function( slotSpec ) {
        if( /^multi\-/i.test(slotSpec.type) )
            return MultiSlot;

        return slotClasses[ (slotSpec.type||'').toLowerCase() ] || Slot;
    },

    getSlot: function( slotname ) {
        return this._slotsByName[slotname];
    },

    getDefaultValue: function( key ) {
        var slot = this.getSlot( key );
        if( ! slot )
            return undefined;
        return slot.defaultValue;
    },

    /**
     * Validate and possibly munge the given value before setting.
     * NOTE: Throw an Error object if it's invalid.
     */
    normalizeSetting: function( key, value, config ) {
        //console.log( 'validating '+key+' '+value );
        var slot = this.getSlot(key);
        if( ! slot )
            throw new Error( 'Unknown configuration key '+key );

        return slot.normalizeValue( value, config );
    }

});
});