/**
 * Lazy-parsing feature implementation for BED stores.
 */

define( ['../../../../dojo/_base/array',
         'JBrowse/Util'
        ],
        function( array, Util ) {

var Feature = Util.fastDeclare(
{
    constructor: function( args ) {
        this.parser  = args.parser;
        this._id = args.id;
        this.data    = args.data;
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
        return t;
    },

    id: function() {
        return this._id;
    },

});

return Feature;
});