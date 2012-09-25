define([ 'dojo/_base/declare',
         'dojo/_base/array'
       ],
       function( declare, array ) {

return declare( null,

 /**
  * @lends JBrowse.View.Export.BED.prototype
  */
{

    constructor: function( args ) {
        args = args || {};
        this.print = args.print || function( line ) { this.output += line; };
        this.refSeq = args.refSeq;
        this.track = args.track;
        this.output = '';
        this._idCounter = 0;

        // print the BED header
        this.print( 'track' );
        if( this.track ) {
            if( this.track.name )
                this.print(' name="'+this.track.name+'"');
            var metadata = this.track.getMetadata();
            if( metadata.key )
                this.print(' description="'+metadata.key+'"');
        }
        this.print(' useScore=0');
        this.print("\n");
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

    formatFeature: function( feature ) {
        var fields = array.map(
                [ feature.get('seq_id') || this.refSeq.name ]
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
    },

    writeFeature: function(feature) {
        this.print( this.formatFeature(feature) );
    }
});

});
