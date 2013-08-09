/**
 * Slot that holds another Configuration, whose contents are defined
 * by another Specification.
 */
define([
           'dojo/_base/declare',
           '../Slot',
           '../../Configuration'
       ],
       function(
           declare,
           Slot,
           Configuration
       ) {
return declare( Slot, {
   constructor: function( args ) {
       if( ! this.schema )
           throw new Error( this.name + ' subconfiguration has no schema' );

       this.schema = new (this.schemaClass)( this.schema );
       this.types = ['object'];
   },

   normalizeValue: function( val ) {
       if( typeof val != 'object' )
           throw new Error( 'a subconfiguration must be an object, not a '+(typeof val) );

       return val instanceof Configuration ? val : this.schema.newConfig( val );
   }

});
});