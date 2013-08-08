define( [
            'dojo/_base/declare',
            'dojo/_base/lang'
        ],
        function(
            declare,
            lang
        ) {

var Slot = declare( null, {

  // has a name, a data type, a value, a default value, and a
  // loading provenance ( rel filename, path in that file ), as well
  // as human-readable metadata about the slot, like a description and
  // context help text
  constructor: function( slotSpec ) {
      declare.safeMixin( this, slotSpec );
      this.types = this._parseType( this.type );
  },

  /**
   * Validates and possibly munges the given setting.  Throws an Error
   * for invalid data.
   */
  normalizeValue: function( value ) {
      if( this._validateType( value ) )
          return value;
      else
          throw new Error( 'invalid value '+value+', not of type '+this.type );
  },

  // validates the value of this slot according to its given type
  _validateType: function( value ) {
      if( ! this.types.length )
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
      if( type == 'function' ) {
          return typeof value == 'function';
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
      else if( type == 'function' ) {
          return typeof value == 'function';
      }
      console.warn( 'unknown config slot type '+type );
      return false;
  }

});

return Slot;
});