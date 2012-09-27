define([ 'dojo/_base/declare',
         'dojo/_base/array'
       ],
       function( declare, array ) {

return declare( null,
{
    /**
     * Data export driver base class.
     * @constructs
     */
    constructor: function( args ) {
        args = args || {};
        this.print = args.print || function( line ) { this.output += line; };
        this.refSeq = args.refSeq;
        this.output = '';
        this.track = args.track;
        this.store = args.store;
    },

    // will need to override this if you're not exporting regular features
    exportRegion: function( region, callback ) {
        var output = '';
        this.store.iterate(
            region.start, region.end,
            dojo.hitch( this, 'writeFeature' ),
            dojo.hitch(this,function () {
                callback( this.output );
            }));
    },

    /**
     * Write the feature to the GFF3 under construction.
     * @returns nothing
     */
    writeFeature: function(feature) {
        console.log('feature');
        this.print( this.formatFeature(feature) );
    }

}
);
});