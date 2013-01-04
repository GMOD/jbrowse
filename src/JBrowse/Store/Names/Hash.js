define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/store/util/QueryResults',
            'JBrowse/Util',
            'JBrowse/Store/Hash',
            'JBrowse/Model/Location'
        ],
        function(
            declare,
            array,
            QueryResults,
            Util,
            HashStore,
            Location
        ) {

return declare( HashStore,
{

    _nameRecordToItem: function( nameRecord ) {
        var name    = nameRecord[0];
        var location = new Location({
            ref: nameRecord[3],
            start: parseInt( nameRecord[4] ),
            end: parseInt( nameRecord[5] )
        });
        return {
            name: name,
            location: location
        };
    },

    _makeResults: function( nameRecords ) {
        // convert the name records into dojo.store-compliant data
        // items, sort them by name and location
        var results = array.map( nameRecords, dojo.hitch(this,'_nameRecordToItem') )
                           .sort( function( a, b ) {
                                      return a.name.localeCompare( b.name )
                                          || a.location.localeCompare( b.location );
                                  });

        var last;

        // uniqify them and make labels for them
        results = array.filter( results, function( i ) {
            if( last && last.name == i.name ) {
                last.label = last.name + ' <span class="multipleLocations">multiple locations</span>';
                return false;
            }
            last = i;
            last.label = last.name + ' <span class="locString">'+last.location+'</span>';
            return true;
        });

        return QueryResults( results );
    },

    // case-insensitive, and supports prefix queries like 'foo*'
    query: function( query, options ) {
        // remove trailing asterisks from query.name
        var thisB = this;
        var name = ( query.name || '' ).toString();
        var trailingStar = /\*$/;
        if( trailingStar.test( name ) ) {
            name = name.replace( trailingStar, '' );
            return this._getEntry( name )
                       .then( function( value ) {
                            value = value || {};
                            return thisB._makeResults( ( value.exact || [] ).concat( value.prefix || [] ) );
                        });
        }
        else {
            return this._getEntry( name )
                       .then( function( value ) {
                           return thisB._makeResults( (value||{}).exact || [] );
                       });
        }
    },

    get: function( id ) {
        return this._getEntry( id )
                   .then( function( bucket ) {
                       var nameRec = (bucket.exact||[])[0];
                       return nameRec ? this._nameRecordToItem( nameRec ) : null;
                   });
    },

    _getEntry: function( key ) {
        return this._getBucket(key)
                   .then( function( bucket ) {
                        return bucket[key];
                    });
    }

});
});
