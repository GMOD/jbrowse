/**
 * Data export driver for BED format.
 */
define([ 'dojo/_base/declare',
         'dojo/_base/array',
         'dojo/when',

         'JBrowse/View/Export'
       ],
       function(
           declare,
           array,
           when,

           ExportBase
       ) {

return declare( ExportBase,
{
    constructor: function( args ) {
        this.track = args.track;
    },

    /**
     * print the BED track definition line
     * @private
     */
    _emitHeader: function( generator ) {
        var head = 'track';
        if( this.track ) {
            if( this.track.name )
                head += ' name="'+this.track.name+'"';
            return when( this.track.getMetadata() )
                .then( function( metadata ) {
                           if( metadata.description )
                               head += ' description="'+metadata.description+'"';
                           generator.emit( head + "\n" );
                       });
        }

        generator.emit( head + "\n" );
        return undefined;
    },

    bed_field_names: [
        'seq_id',
        'start',
        'end',
        'name',
        'score',
        'strand',
        'thickStart',
        'thickEnd',
        'itemRgb',
        'blockCount',
        'blockSizes',
        'blockStarts'
    ],

    /**
     * Format a feature into a string.
     * @param {Object} feature feature object (like those returned from JBrowse/Store/SeqFeature/*)
     * @returns {String} BED string representation of the feature
     */
    formatFeature: function( feature ) {
        var fields = array.map(
                [ feature.get('seq_id') || this.refSeq.get('seq_id') ]
                .concat( dojo.map( this.bed_field_names.slice(1,11), function(field) {
                                       return feature.get( field );
                                   },this)
                       ),
            function( data ) {
                var t = typeof data;
                if( t == 'string' || t == 'number' )
                    return data;
                return '';
            },
            this
        );

        // normalize the strand field
        fields[5] = { '1': '+', '-1': '-', '0': '+' }[ fields[5] ] || fields[5];
        return fields.join("\t")+"\n";
    }

});

});
