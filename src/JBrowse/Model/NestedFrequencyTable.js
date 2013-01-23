define( [
            'JBrowse/Util'
        ],
        function( Util ) {

// a class that keeps a frequency table.  the categories in the
// frequency table can be other frequency tables

var NestedFrequencyTable = Util.fastDeclare({
    constructor: function( initialData ) {
        this.categories = {};
        if( initialData )
            dojo.mixin( this.categories, initialData );
    },
    total: function() {
        // calculate total if necessary
        var t = 0;
        for( var k in this.categories ) {
            var v = this.categories[k];
            t += v.total ? v.total() : v;
        }
        return t;
    },
    decrement: function( slotName ) {
        if( !slotName )
            slotName = 'default';
        else
            slotName = slotName.toString();

        if( this.categories[slotName] )
            return --this.categories[slotName];
        else
            return 0;
    },
    increment: function( slotName ) {
        if( !slotName )
            slotName = 'default';
        else
            slotName = slotName.toString();
        return ( this.categories[slotName] = (this.categories[slotName] || 0) + 1 );
    },
    get: function( slotName ) {
        return this.categories[slotName] || 0;
    },
    getNested: function( path ) {
        if( typeof path == 'string' )
            path = path.split('/');

        if( ! path.length )
            return this;

        var slotName = path[0].toString();
        var slot = this.categories[slotName];
        if( ! slot )
            slot = this.categories[slotName] = new NestedFrequencyTable();

        if( path.length > 1 )
            return slot.getNested( path.slice(1) );
        else
            return slot;
    },
    toString: function() {
        return this.total();
    },
    forEach: function( func, ctx ) {
        var c = this.categories;
        if( ctx ) {
            for( var slotName in c ) {
                func.call( ctx, c[slotName], slotName );
            }
        } else {
            for( var slotName in c ) {
                func( c[slotName], slotName );
            }
        }
    }

});

return NestedFrequencyTable;

});