define([ 'dojo/_base/declare',
         'dojo/_base/lang',
         'dojo/when',

         'JBrowse/Util/DeferredGenerator'
       ],
       function(
           declare,
           lang,
           when,

           DeferredGenerator
       ) {

return declare( null,
{
    /**
     * Data export driver base class.
     * @constructs
     */
    constructor: function( args ) {
        args = args || {};
        this.browser = args.browser;
        if( ! this.browser ) throw 'browser arg required';

        this.store = args.store;
    },

    /**
     * given a query object, return a DeferredGenerator that emits
     * chunks of the exported data file.
     */
    exportRegion: function( query ) {
        var thisB = this;
        return new DeferredGenerator( function( generator ) {
            return when( thisB._emitHeader( generator ) )
                        .then( function() {
                            return thisB.store.getFeatures( query )
                                       .forEach(
                                           function( f ) {
                                               var data = thisB.formatFeature( f );
                                               if( data )
                                                   if( typeof data.then == 'function' )
                                                       return data.then( function( data ) { generator.emit( data ); } );
                                                   else
                                                       generator.emit( data );

                                               return undefined;
                                           });
                               })
                        .then( lang.hitch( thisB, '_emitFooter', generator ) );
        });
    },

    _emitHeader: function( generator ) {
    },
    _emitFooter: function( generator ) {
    }
}
);
});