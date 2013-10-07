define([ 'dojo/_base/declare',
         'dojo/_base/lang',
         'dojo/_base/array'
       ],
       function( declare, lang, array ) {

return declare( null,
{
    /**
     * Data export driver base class.
     * @constructs
     */
    constructor: function( args ) {
        args = args || {};
        this.printFunc = args.print || function( line ) { this.output += line; };
        this.refSeq = args.refSeq;
        this.track = args.track;
        this.store = args.store;
    },

    // will need to override this if you're not exporting regular features
    exportRegion: function( query ) {
        var thisB = this;
        return this.store.getFeatures( query )
            .each(
                lang.hitch( this, 'formatFeature' )
            );
    },

    emit: function( l ) {
        if( lang.isArray( l ) ) {
            array.forEach( l, this.printFunc, this );
        } else {
            this.printFunc( l );
        }
    },

    /**
     * Write the feature to the GFF3 under construction.
     * @returns nothing
     */
    writeFeature: function(feature) {
        this.print( this.formatFeature(feature) );
    }
}
);
});