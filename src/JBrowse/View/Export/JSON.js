/**
 * Support for Sequin Feature table export.  See
 * http://www.ncbi.nlm.nih.gov/Sequin/table.html.
 */

define([ 'dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/Store/SeqFeature/NCList',
         'JBrowse/View/Export',
        'JBrowse/Util/GFF3'
       ],
       function( declare, array,NCList, ExportBase,UtilGFF3 ) {

return declare( ExportBase,

{
    /**
     * Data export driver for GFF3 format.
     * @constructs
     */
    constructor: function( args ) {
        this._idCounter = 0;
        this.lastSync = 0;
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

    _buildObject: function(feature,returnObj,parentID){
        var returnObj = returnObj ? returnObj : {};
        returnObj.seq_id= feature.get('seq_id');
        returnObj.start = feature.get('start')+1;
        returnObj.end = feature.get('end');
        returnObj.type = feature.get('type') || 'region';
        returnObj.strand = feature.get('strand') ;

        // format the attributes
        var attr = this._gff3_attributes( feature );
        if( parentID ){
            attr.Parent = parentID;
            returnObj.parentId = parentID ;
        }
        else{
            delete attr.Parent;
        }

        var subfeatures = feature.get('subfeatures');
        for(subfeat in subfeatures){
            // console.log(subfeat) ;
            if(!returnObj.subfeatures) returnObj.subfeatures = [] ;

            returnObj.subfeatures.push( this._buildObject(subfeatures[subfeat],returnObj,attr.ID));
        }
        return returnObj;
    },

    /**
     * Format a feature into a string.
     * @param {Object} feature feature object (like those returned from JBrowse/Store/SeqFeature/*)
     * @returns {String} GFF3 string representation of the feature
     */
    formatFeature: function( feature, returnObj, parentID) {
        var returnObj = this._buildObject(feature,returnObj,parentID)
        console.log(returnObj);
        return returnObj;
    },

    /**
     * Write the feature to the GFF3 under construction.
     * @returns nothing
     */
    writeFeature: function(feature) {
        var fmt = this.formatFeature(feature);
        this.print( fmt );

        // avoid printing sync marks more than every 10 lines
        if( this.lastSync >= 9 ) {
            this.lastSync = 0;
            this.print( "###\n" );
        } else {
            this.lastSync += fmt.length || 1;
        }
    },

    /**
     * Extract a key-value object of gff3 attributes from the given
     * feature.  Attribute names will have proper capitalization.
     * @private
     */
    _gff3_attributes: function(feature) {
        var tags = array.filter( feature.tags(), dojo.hitch(this, function(f) {
            f = f.toLowerCase();
            return this._is_not_gff3_tab_field(f) && f != 'subfeatures';
        }));
        var attrs = {};
        array.forEach( tags, function(tag) {
            var val = feature.get(tag);
            var valtype = typeof val;
            if( valtype == 'boolean' )
                val = val ? 1 : 0;
            else if( valtype == 'undefined' )
                return;
            tag = this._gff3_reserved_attribute(tag) || this._ensure_non_reserved( tag );
            attrs[tag] = val;
        },this);
        return attrs;
    },

    // ensure that an attribute name is not reserved.  currently does
    // this by adding a leading underscore to attribute names that
    // have initial capital letters.
    _ensure_non_reserved: function( str ) {
        return str.replace(/^[A-Z]/,function() { return '_'+str[0]; });
    },

    /**
     * @private
     * @returns {String} formatted attribute string
     */
    _gff3_format_attributes: function( attrs ) {
        var attrOrder = [];
        for( var tag in attrs ) {
            var val = attrs[tag];
            if(!val) {
                continue;
            }
            var valstring = val.hasOwnProperty( 'toString' )
                ? this._gff3_escape( val.toString() ) :
                val.values
                    ? function(val) {
                    return val instanceof Array
                        ? array.map( val, lang.hitch(this,'_gff3_escape') ).join(',')
                        : this._gff3_escape( val );
                }.call(this,val.values) :
                    val instanceof Array
                        ? array.map( val, lang.hitch(this,'_gff3_escape') ).join(',')
                        : this._gff3_escape( val );
            attrOrder.push( this._gff3_escape( tag )+'='+valstring);
        }
        return attrOrder.join(';') || '.';
    },

    /**
     * @returns always an escaped string representation of the passed value
     * @private
     */
    _gff3_escape: function( val ) {
        return (''+val).replace(/[\n\r\t\;\=%&,\x00-\x1f\x7f-\xff]+/g, UtilGFF3.escape );
    }
});
});