define([ 'dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/View/Export'
       ],
       function( declare, array, ExportBase ) {

return declare( ExportBase,
 /**
  * @lends JBrowse.View.Export.bedGraph.prototype
  */
{
    /**
     * Data export driver for bedGraph format.
     * @constructs
     */
    constructor: function( args ) {
        // print the track definition
        this.print( 'track type=bedGraph' );
        if( this.track ) {
            if( this.track.name )
                this.print(' name="'+this.track.name+'"');
            var metadata = this.track.getMetadata();
            if( metadata.key )
                this.print(' description="'+metadata.key+'"');
        }
        this.print("\n");
    },

    // will need to override this if you're not exporting regular features
    exportRegion: function( region, callback ) {
        var output = '';
        this.store.readWigData(
            1,
            this.refSeq.name,
            region.start,
            region.end+1,
            dojo.hitch( this, function( features ) {
                array.forEach( features, function(f) {
                    this.print( [
                                    f.get('seq_id'),
                                    f.get('start'),
                                    f.get('end'),
                                    f.get('score')
                                ].join("\t")
                                + "\n"
                              );
                }, this );
                callback( this.output );
            })
        );
    }

});
});