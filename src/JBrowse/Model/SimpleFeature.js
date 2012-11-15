define([
        'JBrowse/Util'
       ],
       function( Util ) {

var counter = 0;

return Util.fastDeclare({

    constructor: function( args ) {
        args = args || {};
        this.data = args.data || {};
        this._uniqueID = args.id || 'SimpleFeature_'+(counter++);
    },

    get: function(name) {
        return this.data[ name ];
    },

    set: function( name, val ) {
        this.data[ name ] = val;
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

    id: function( newid ) {
        if( newid )
            this._uniqueID = newid;
        return this._uniqueID;
    }

});

});