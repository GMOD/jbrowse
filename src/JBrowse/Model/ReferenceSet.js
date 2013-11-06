/**
 * A logical grouping of reference sequences.  Most browsers might
 * call this a "Genome", but that's not a good term, because this is
 * more general than that.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',

           'JBrowse/Store/SeqFeature/FromConfig'
       ],
       function(
           declare,
           lang,

           FromConfig
       ) {

return declare( null, {

   constructor: function( args ) {
       this._name = args.name;
       if( ! this._name ) throw new Error('name arg required');
       this._metadata = lang.clone( args.metadata || {} );
       this._dataHub = args.dataHub;
       if( ! this._dataHub ) throw new Error('dataHub arg required');

       if( args.store ) {
           this._store = args.store;
           this._storeQuery = args.storeQuery;
       }
       else if( args.regions ) {
           this._refSeqStore = new FromConfig(
               { config: { features: args.regions },
                 browser: args.browser,
                 dataHub: args.dataHub
               });
           this._storeQuery = {};
       }
       else {
           throw new Error('refSeqs or store arg required');
       }
   },

   getName: function() {
       return this._name;
   },

   getFeatures: function() {
       return this.getReferenceSequences.apply( this, arguments );
   },

   getReferenceSequences: function( query ) {
       if( this._refSeqStore ) {
           return this._refSeqStore.getFeatures( query );
       } else {
           return this._store.getReferenceFeatures(
               lang.mixin( {}, this._storeQuery || {}, query )
           );
       }
   }

});
});