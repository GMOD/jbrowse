define([ 'dojo/_base/declare',
         'dojo/_base/array',

         'JBrowse/View/Export',
         'JBrowse/Util',
         'JBrowse/Util/DeferredGenerator'

       ],
       function(
           declare,
           array,

           ExportBase,
           Util,
           DeferredGenerator

       ) {

return declare( ExportBase,

 /**
  * @lends JBrowse.View.Export.FASTA.prototype
  */
{

    /**
     * Data export driver for FASTA format.
     * @constructs
     */
    // constructor: function( args ) {
    // },

    // will need to override this if you're not exporting regular features
    exportRegion: function( region ) {
        var thisB = this;
        return new DeferredGenerator(
            function( generator ) {
                thisB.store.getReferenceSequence( region.ref, region.start, region.end )
                    .then( function ( seq ) {
                               generator.emit( thisB._formatFASTA( region, seq ) );
                               generator.resolve();
                           });
            });
    },

    _formatFASTA: function( region, seq ) {
        return '>' + region.get('seq_id')
            +' '+Util.assembleLocString(region) + "\n"
            + this._wrap( seq, 78 );
    },

    _wrap: function( string, length ) {
        length = length || 78;
        return string.replace( new RegExp('(.{'+length+'})','g'), "$1\n" );
    }
});
});

