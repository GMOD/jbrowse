/**
 * A logical grouping of reference sequences.  Most browsers might
 * call this a "Genome", but that's not a good term, because this is
 * more general than that.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',

           'JBrowse/Util',
           'JBrowse/Store/SeqFeature/FromConfig',
           'JBrowse/Model/ReferenceFeature',
           'JBrowse/Model/BigSequence'
       ],
       function(
           declare,
           lang,

           Util,
           FromConfig,
           ReferenceFeature,
           BigSequence
       ) {

return declare( null, {

   constructor: function( args ) {
       this._name = args.name;
       if( ! this._name ) throw new Error('name arg required');
       this._metadata = lang.clone( args.metadata || {} );
       this._dataHub = args.dataHub;
       this._sequenceStoreName = args.sequenceStore;
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
       var features = this._refSeqStore
           ? this._refSeqStore.getFeatures( query )
           : this._store.getReferenceFeatures(
               lang.mixin( {}, this._storeQuery || {}, query )
           );
       var thisB = this;

       // upgrade the reference features to add a getSequence method
       // if they don't already have one
       return features.each(
           function( feature ) {
               if( typeof feature.getSequence != 'function' ) {
                   if( thisB._sequenceStoreName ) {
                       feature.getSequence = function( start, end ) {
                           return thisB._dataHub.openStore( thisB._sequenceStoreName )
                               .then( function( seqStore ) {
                                          return new BigSequence(
                                              { store: seqStore,
                                                name: feature.get('seq_id'),
                                                start: feature.get('start'),
                                                end: feature.get('end')
                                              }).getRange( start, end );
                                      });
                       };
                   }
                   // if there is no sequence store, they will just
                   // return a blank string of the proper length
                   else {
                       feature.getSequence = function( start, end ) {
                           return Util.resolved( undefined );
                       };
                   }
               }

               return feature;
           });
   }

});
});