define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/json'
        ],
        function(
            declare,
            lang,
            dJSON
        ) {

var json = JSON || dJSON;

var Slot = declare( null, {

  // has a name, a data type, a value, a default value, and a
  // loading provenance ( rel filename, path in that file ), as well
  // as human-readable metadata about the slot, like a description and
  // context help text
  constructor: function( slotSpec, parent ) {
      declare.safeMixin( this, slotSpec );
      if( ! this.type )
          throw new Error('`type` missing from slot specification '+json.stringify( slotSpec ) );
      this.types = this._parseType( this.type );
      this.parent = parent;
  },

  /**
   * Validates and possibly munges the given setting.  Throws an Error
   * for invalid data.
   */
  normalizeValue: function( value, config ) {
      if( this._validateType( value ) )
          return value;
      else
          throw new Error( 'invalid value '+value+' for '+this.name+', not of type '+this.type );
  },

  normalizeFunction: function( valfunc, config ) {
      var thisB = this;
      return function() {
          return thisB.normalizeValue( valfunc.apply( this, arguments ) );
      };
  },

  // delegate slot class resolution to the parent (Specification, or
  // another Slot) of this class
  getSlotClass: function( slotSpec ) {
      return this.parent.getSlotClass( slotSpec );
  },

  // validates the value of this slot according to its given type
  _validateType: function( value ) {
      if( value === undefined    //< undefined is valid for all types
          || ! this.types.length //< or if we have no set type
        )
          return true;

      for( var i = 0; i<this.types.length; i++ ) {
          if( this._validType( this.types[i], value ) )
              return true;
      }
      return false;
  },

  _parseType: function( type, strOffset ) {
      // could eventually do more complex type-expression parsing here
      return type.toLowerCase().replace(/^\s*|\s*$/g,'').split(/\s*\|\s*/);
  },

  // has a name, a type, value, default value, and a provenance ( rel filename, path in that file )
  _validType: function( type, value ) {
      //console.log( 'validate '+value+' against '+type );
      if( ! type ) return true;
      if( type == 'boolean' ) {
          return !!value === value;
      }
      else if( type == 'integer' ) {
          return Math.floor( value ) === value;
      }
      else if( type == 'float' ) {
          return value+0 === value;
      }
      else if( type == 'string' ) {
          return value+'' === value;
      }
      else if( type == 'object' ) {
          return typeof value == 'object' && ! lang.isArray( value );
      }
      else if( type == 'array' ) {
          return lang.isArray( value );
      }
      console.warn( 'unknown config slot type '+type );
      return false;
  }

});

return Slot;
});