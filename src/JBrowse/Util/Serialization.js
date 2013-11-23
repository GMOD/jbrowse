/**
 * Utility functions for serializing and deserializing objects to and
 * from JSON.  Uses a scheme in which { $class: 'Foo/Bar', ... } will
 * be inflated to new FooBar({...}).
 */
define([
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/json',
           'dojo/promise/all',

           'JBrowse/Util'
       ],
       function(
           array,
           lang,
           JSON,
           all,

           Util
       ) {

var SerializationUtils = {

    // given a thing (maybe an object, maybe not), convert it to bare
    // data in preparation for serialization
    deflate: function deflate( thing, seen ) {
        if( array.indexOf( seen, thing ) > -1 )
            throw new Error( 'cycle encountered when deflating '+seen[0]+': '+seen.concat(thing).join(',') );

        if( thing ) {
            if( typeof thing.deflate == 'function' )
                return thing.deflate();
            else if( lang.isArray( thing ) ) {
                return array.map( thing, function( subthing ) {
                    return deflate( subthing, seen );
                });
            } else if( typeof thing == 'object' ) {
                seen = (seen||[]).concat(thing);
                var deflated = {};
                for( var n in thing ) {
                    if( thing.hasOwnProperty( n ) && n.charAt(0) != '_' && typeof thing[n] != 'function' ) {
                        deflated[n] = deflate( thing[n], seen );
                    }
                }
                return deflated;
            }
        }
        return thing;
    },

    // given bare data, deep-inflate it using any $class members,
    // return a Deferred for the inflated structure.  loads classes on
    // the fly as necessary.
    inflate: function inflate( data ) {
        data = lang.clone( data );

        if( lang.isArray( data ) ) {
            return all( array.map( data, function( d ) {
                return inflate( d );
            }));
        }
        else if( typeof data == 'object' ) {
            var class_ = data.$class;
            delete data.$class;
            if( class_ ) {
                return inflate( data )
                         .then( function(d) {
                                    return Util.instantiate( class_, d );
                                });
            }
            else {
                // inflate all the members
                var inflations = [];
                for( var a in data ) {
                    if( data.hasOwnProperty( a ) )
                        (function( attr ) {
                             inflations.push(
                                 inflate( data[attr] )
                                     .then( function(d) { data[attr] = d; } )
                             );
                         })( a );
                }
                return all( inflations ).then( function() { return data; } );
            }
        }

        return Util.resolved( data );
    },

    // parse and inflate
    deserialize: function( string ) {
        return SerializationUtils.inflate( JSON.parse( string ) );
    },

    // deflate and encode as JSON
    serialize: function( thing ) {
        return JSON.stringify( SerializationUtils.deflate( thing ) );
    }
};

return SerializationUtils;
});