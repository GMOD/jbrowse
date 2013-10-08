/**
 * Singleton object that holds media types known to JBrowse, and can
 * guess the type of a resource from a sample of the first bit of it.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array'
       ],function(
           declare,
           lang,
           array
       ) {

var MediaType = declare( 'JBrowse.MediaTypes.MediaType', null, {
  constructor: function(args) {
      lang.mixin( this, args );
  },
  toString: function() {
      return this.imType || this.fileExtensions && this.fileExtensions[0] || this.name;
  }
});

var MediaTypes;
return MediaTypes = new ( declare( 'JBrowse.MediaTypes', null,{

  constructor: function() {
      this._organizeTypes();
  },

  _organizeTypes: function() {
      // normalize the type records to fill in missing labels,
      // internet media types, etc.
      this._typeRecords = array.map(
          this._typeRecords, function( t ) {
              t = lang.mixin( {}, t );
              if( ! t.label )
                  t.label = t.name;
              if( ! t.fileExtensions ) {
                  try {
                      t.fileExtensions = [ t.imType.match(/application\/x-(.+)/)[1].toLowerCase() ];
                  } catch(e) {
                      if( /^\S+$/.test(t.name) )
                          t.fileExtensions = [ t.name.toLowerCase() ];
                  }
              }
              if( ! t.imType && t.fileExtensions )
                  t.imType = 'application/x-'+(t.fileExtensions[0].toLowerCase());
              return new MediaType(t);
          }, this);

      //console.log( this._typeRecords );

      this._typesByName = {};
      array.forEach( this._typeRecords, function( t ) {
                         this._typesByName[t.name.toLowerCase()] = t;
                     },this);
  },

  registerType: function( record ) {
      this._typeRecords.push( record );
      this._organizeTypes();
  },

  guessType: function( data ) {

  },

  /**
   * Given a single string or array of strings, return an array of
   * type records for those type names, or undefined if the type is
   * not known.
   */
  getTypeRecords: function( types ) {
      if( typeof types == 'string' )
          types = [ types ];
      return array.map( types, function( t ) {
                            return this._typesByName[ t.toLowerCase() ];
                        }, this );
  },

  _typeRecords: [
      { name: 'GFF3',
        description: 'Generic Feature Format version 3',
        url: 'http://www.sequenceontology.org/gff3.shtml',
        guessType: { regex: /##gff-version\s+3/ }
      },
      { name: 'BED' },
      { name: 'BAM' },
      { name: 'BAI' },
      { name: 'Sequin Table', fileExtensions: ['sqn'] },
      { name: 'FASTA', fileExtensions: [ 'fasta', 'fa', 'fn' ] }
  ]
}))();

});