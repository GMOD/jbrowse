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
    inflate: function inflate( data, context ) {

        function _instantiate( data, context, classesByName ) {
            if( lang.isArray( data ) ) {
                for( var i = 0; i < data.length; i++ )
                    data[i] = _instantiate( data[i], context, classesByName );
            }
            else if( typeof data == 'object' ) {
                var className = data.$class;
                delete data.$class;
                if( className ) {
                    data = _instantiate( data, context, classesByName );
                    var Class = classesByName[ className ];
                    if( ! Class ) throw new Error( 'class '+className+' not found' );
                    return new Class(data);
                }
                else {
                    // inflate all the members
                    var inflations = [];
                    for( var a in data ) {
                        if( data.hasOwnProperty( a ) )
                            data[a] = _instantiate( data[a], context, classesByName );
                    }
                    return data;
                }
            }
            else if( typeof data == 'string' && (match = data.match(/^\$context\.(\w+)$/)) ) {
                if( context && context[match[1]] ) {
                    //console.log( 'inflating '+data+' to', context[match[1]] );
                    data = context[match[1]];
                }
            }

            return data;
        };

        data = lang.clone( data ); // clone so we can modify in-place

        // gather a list of all the class names
        var classNames = [];
        (function gatherClassNames( classlist, data ) {
            if( lang.isArray( data ) ) {
                for( var i = 0; i<data.length; i++ )
                    gatherClassNames( classlist, data[i] );
            }
            else if( typeof data == 'object' ) {
                if( data.$class )
                    classlist.push( data.$class );

                for( var a in data ) {
                    if( data.hasOwnProperty(a) )
                        gatherClassNames( classlist, data[a] );
                }
            }
         })( classNames, data );

        // uniqify the class name list
        classNames = Util.uniq( classNames );

        // load the classes if necessary, then traverse the data
        // structure and instantiate them
        return Util.loadJS( classNames )
            .then( function( classes ) {
                       // index the classes by name
                       var classesByName = {};
                       for( var i = 0; i<classNames.length; i++ ) {
                           classesByName[ classNames[i] ] = classes[i];
                       }

                       // traverse the data structure again, instantiating classes
                       _instantiate( data, context, classesByName );

                       return data;
                   });
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