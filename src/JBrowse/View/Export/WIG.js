define([ 'dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/View/Export'
       ],
       function( declare, array, ExportBase ) {

return declare( ExportBase,
 /**
  * @lends JBrowse.View.Export.WIG.prototype
  */
{
    /**
     * Data export driver for WIG format.
     * @constructs
     */
    constructor: function( args ) {
        // print the track definition
        this.print( 'track type=wiggle_0' );
        if( this.track ) {
            if( this.track.name )
                this.print(' name="'+this.track.name+'"');
            var metadata = this.track.getMetadata();
            if( metadata.key )
                this.print(' description="'+metadata.key+'"');
        }
        this.print("\n");
    },

    _printStep: function( ref, span ) {
        // print the WIG step
        this.print( 'variableStep chrom='+ref+' span='+span+"\n" );
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
                var curspan;
                var curref;
                array.forEach( features, function(f) {
                    var span = f.get('end') - f.get('start');
                    var ref = f.get('seq_id');
                    if( !( curspan == span && ref == curref ) ) {
                        this._printStep( ref, span );
                        curref = ref;
                        curspan = span;
                    }
                    this.print( (f.get('start')+1) + "\t" + f.get('score') + "\n" );
                }, this );
                callback( this.output );
            })
        );
    }

});
});