/**
 * Lazy-parsing feature implementation for VCF stores.
 */

define( ['dojo/_base/array',
         'dojo/json',
         'JBrowse/Util'
        ],
        function( array, dojoJSON, Util ) {

var Feature = Util.fastDeclare(
{
    constructor: function( args ) {
        this.parser  = args.parser;
        this.data    = args.data;
        this._id = args.id;
        this.fields  = args.fields;
    },

    get: function( field) {
        return this._get( field ) || this._get( field.toLowerCase() );
    },

    // same as get(), except requires lower-case arguments.  used
    // internally to save lots of calls to field.toLowerCase()
    _get: function( field ) {
        return field in this.data ? this.data[field] : // have we already parsed it out?
            function(field) {
                var v = this.data[field] =
                    this['_parse_'+field] ? this['_parse_'+field]()            : // maybe we have a special parser for it
                                            undefined;
                return v;
            }.call(this,field);
    },

    parent: function() {
        return null;
    },

    children: function() {
        return null;
    },

    tags: function() {
        var t = [];
        var d = this.data;
        for( var k in d ) {
            if( d.hasOwnProperty( k ) )
                t.push( k );
        }
        if( ! d.genotypes )
            t.push('genotypes');
        return t;
    },

    id: function() {
        return this._id;
    },

    _parse_genotypes: function() {
        var fields = this.fields;
        var parser = this.parser;
        delete this.fields; // TODO: remove these deletes if we add other laziness
        delete this.parser;

        if( fields.length < 10 )
            return null;

        // parse the genotype data fields
        var genotypes = [];
        var format = array.map( fields[8].split(':'), function( fieldID ) {
                         return { id: fieldID, meta: parser.getVCFMetaData( 'FORMAT', fieldID ) };
                     }, this );
        for( var i = 9; i < fields.length; ++i ) {
            var g = (fields[i]||'').split(':');
            var gdata = {};
            for( var j = 0; j<format.length; ++j ) {
                var gData = g[j] || '';
                gdata[ format[j].id ] = {
                    // don't split on commas if it looks like a string
                    values: gData.charAt(0) == '"' ? [ gData ] : gData.split(','),
                    meta: format[j].meta
                };
            }
            genotypes.push( gdata );
        }

        // index the genotypes by sample ID
        var bySample = {};
        for( var i = 0; i<genotypes.length; i++ ) {
            var sname = (parser.header.samples||{})[i];
            if( sname ) {
                bySample[sname] = genotypes[i];
            }
        }

        // add a toString to it that serializes it to JSON without its metadata
        //bySample.toString = this._stringifySample;

        return bySample;
    },

    _stringifySample: function() {
        var ex = {};
        for( var sample in this ) {
            var srec = ex[sample] = {};
            for( var field in this[sample] ) {
                    srec[field] = this[sample][field].values;
            }
        }
        return (JSON||dojoJSON).stringify( ex );
    }

});

return Feature;
});
