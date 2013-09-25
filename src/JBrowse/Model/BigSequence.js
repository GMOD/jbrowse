/**
 * A sequence that's too big to hold in memory, and that you have to
 * fetch (deferred) ranges of.
 */

define([
           'dojo/_base/lang',
           'JBrowse/Util'
       ],
       function(
           lang,
           Util
       ) {

return Util.fastDeclare({

   constructor: function( args ) {
       this.name = args.name;
       this.start = args.start || 0;
       this.end = args.end;
       if( this.end === undefined ) {
           throw new Error('end required');
       }

       this.store = args.store;
       this.sequenceQuery = args.sequenceQuery || { name: this.name, seq_id: this.name, type: '_sequence_fragment' };
   },

   getRange: function( start, end ) {
       if( start === undefined )
           start = 0;
       if( end === undefined )
           end = this.end;

       return this._getSequence( start, end );
   },

   _getSequence: function( start, end ) {

       // inserts the `replacement` string into `str` at the given
       // `offset`, putting in `length` characters.  pad with spaces
       // at the beginning of the string if necessary
       function replaceAt( str, offset, replacement ) {
           var rOffset = 0;
           if( offset < 0 ) {
               rOffset = -offset;
               offset = 0;
           }

           var length = Math.min( str.length - offset, replacement.length - rOffset );

           return str.substr(0,offset) + replacement.substr( rOffset, length ) + str.substr( offset+length );
       }

       var len = end - start;
       var sequence = '';
       while( sequence.length < len )
           sequence += ' ';

       var thisB = this;
       var query = lang.mixin( {}, this.sequenceQuery, { start: start, end: end } );
       return this.store.getSequenceFragments( query )
           .forEach( function( f ) {
                         var seq, start = f.get('start');
                         if(( seq = f.get('residues') || f.get('seq') ))
                             sequence = replaceAt( sequence, start-query.start, seq );
                     },
                     function() {
                         return sequence;
                     }
                   );
   }

});
});