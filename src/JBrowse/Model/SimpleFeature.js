/**
 * Simple implementation of a feature object.
 */
define([
        'JBrowse/Util'
       ],
       function( Util ) {

var counter = 0;

var SimpleFeature = Util.fastDeclare({

    /**
     * @param args.data {Object} key-value data, must include 'start' and 'end'
     * @param args.parent {Feature} optional parent feature
     * @param args.id {String} optional unique identifier.  can also be in data.uniqueID.
     *
     * Note: args.data.subfeatures can be an array of these same args,
     * which will be inflated to more instances of this class.
     */
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

    /**
     * Get a piece of data about the feature.  All features must have
     * 'start' and 'end', but everything else is optional.
     */
    get: function(name) {
        return this.data[ name ];
    },

    /**
     * Set an item of data.
     */
    set: function( name, val ) {
        this.data[ name ] = val;
    },

    /**
     * Get an array listing which data keys are present in this feature.
     */
    tags: function() {
        var t = [];
        var d = this.data;
        for( var k in d ) {
            if( d.hasOwnProperty( k ) )
                t.push( k );
        }
        return t;
    },

    /**
     * Get the unique ID of this feature.
     */
    id: function( newid ) {
        if( newid )
            this._uniqueID = newid;
        return this._uniqueID;
    },

    /**
     * Get this feature's parent feature, or undefined if none.
     */
    parent: function() {
        return this._parent;
    },

    /**
     * Get an array of child features, or undefined if none.
     */
    children: function() {
        return this.get('subfeatures');
    }

});

return SimpleFeature;
});