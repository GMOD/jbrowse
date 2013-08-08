/**
 * Slot that holds another Configuration, whose contents are defined
 * by another Specification.
 */
define([
           'dojo/_base/declare',
           '../Slot'
       ],
       function(
           declare,
           Slot
       ) {
return declare( Slot, {
   constructor: function( args ) {
       if( ! this.specification )
           throw new Error('SubConfiguration slot must be instantiated with a specification');

       this.specification = new (this.specificationClass)( this.specification );
       this.types = ['object'];
   },

   normalizeValue: function( val, config ) {
       if( typeof val != 'object' )
           throw new Error( 'a subconfiguration must be an object, not a '+(typeof val) );

       var ConfigurationClass = config.constructor._meta.bases[0];

       return val instanceof ConfigurationClass ? val : new ConfigurationClass( this.specification, val );
   }

});
});