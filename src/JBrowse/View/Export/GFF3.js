define([ 'dojo/_base/declare',
         'dojo/_base/array'
       ],
       function( declare, array ) {

return declare( null,

 /**
  * @lends JBrowse.View.Export.GFF3.prototype
  */
{

    constructor: function( args ) {
        args = args || {};
        this.print = args.print || function( line ) { this.output += line; };
        this.refSeq = args.refSeq;
        this.output = '';
    },

    gff3_field_names: [
        'seq_id',
        'source',
        'type',
        'start',
        'end',
        'score',
        'strand',
        'phase',
        'attributes'
    ],

    gff3_reserved_attributes: [
        'ID',
        'Name',
        'Alias',
        'Parent',
        'Target',
        'Gap',
        'Derives_from',
        'Note',
        'Dbxref',
        'Ontology_term',
        'Is_circular'
    ],

    /**
     * @returns false if the field goes in tabular portion of gff3, true otherwise
     * @private
     */
    _is_not_gff3_tab_field: function( fieldname ) {
        if( ! this._gff3_fields_by_name ) {
            var fields = {};
            dojo.forEach( this.gff3_field_names, function(f) {
                              fields[f] = true;
                          });
            this._gff3_fields_by_name = fields;
        }

        return ! this._gff3_fields_by_name[ fieldname.toLowerCase() ];
    },

    /**
     * @returns the capitalized attribute name if the given field name
     * corresponds to a GFF3 reserved attribute
     * @private
     */
    _gff3_reserved_attribute: function( fieldname ) {
        if( ! this._gff3_reserved_attributes_by_lcname ) {
            var fields = {};
            dojo.forEach( this.gff3_reserved_attributes, function(f) {
                              fields[f.toLowerCase()] = f;
                          });
            this._gff3_reserved_attributes_by_lcname = fields;
        }

        return this._gff3_reserved_attributes_by_lcname[ fieldname.toLowerCase() ];
    },

    formatFeature: function( feature ) {
        var fields = dojo.map(
                [ feature.get('seq_id') || this.refSeq.name ]
                .concat( dojo.map( this.gff3_field_names.slice(1,7), function(field) {
                                       return feature.get( field );
                                   },this)
                       ),
            function( data ) {
                return this._gff3_escape( data || '.' );
            },
            this
        );

        // convert back from interbase
        if( typeof parseInt(fields[3]) == 'number' )
            fields[3]++;
        // normalize the strand field
        fields[6] = { '1': '+', '-1': '-', '0': '.' }[ fields[6] ] || fields[6];

        // format the attributes
        fields[8] = this._gff3_format_attributes( feature );

        return fields.join("\t")+"\n";
    },

    writeFeature: function(feature) {
        this.print( this.formatFeature(feature)+"###\n" );
    },

    /**
     * @private
     */
    _gff3_format_attributes: function( feature ) {
        var tags = array.filter( feature.tags(), dojo.hitch(this, function(f) {
            f = f.toLowerCase();
            return this._is_not_gff3_tab_field(f) && f != 'subfeatures';
        }));
        var attrs = [];
        array.forEach( tags, function(tag) {
            var val = feature.get(tag);
            if( typeof val != 'string' && typeof val != 'number' )
                return;
            attrs.push( this._gff3_escape( this._gff3_reserved_attribute(tag) || tag.toLowerCase() )+'='+this._gff3_escape( val ) );
        },this);
        return attrs.join(';');
    },

    /**
     * @returns always an escaped string representation of the passed value
     * @private
     */
    _gff3_escape: function( val ) {
        return (''+val).replace(/[\n\r\t\;\=%&,\x00-\x1f\x7f-\xff]+/g, escape );
    }
});

});
