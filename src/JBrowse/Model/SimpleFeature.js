define([
        'JBrowse/Util'
       ],
       function( Util ) {

var counter = 0;

var SimpleFeature = Util.fastDeclare({

    constructor: function( args ) {
        args = args || {};
        this.data = args.data || {};
        this._parent = args.parent;
        this._uniqueID = args.id || this.data.uniqueID || (
            this._parent ? this._parent.id()+'_'+(counter++) : 'SimpleFeature_'+(counter++)
        );

        // inflate any subfeatures that are not already feature objects
        var subfeatures;
        if(( subfeatures = this.data.subfeatures )) {
            for( var i = 0; i < subfeatures.length; i++ ) {
                if( typeof subfeatures[i].get != 'function' ) {
                    subfeatures[i] = new SimpleFeature(
                        { data: subfeatures[i],
                          parent: this
                        });
                }
            }
        }
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
    },

    parent: function() {
        return this._parent;
    },

    children: function() {
        return this.get('subfeatures');
    }

});

return SimpleFeature;
});