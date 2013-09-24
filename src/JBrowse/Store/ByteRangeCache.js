define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/Deferred',
           'JBrowse/has',
           'JBrowse/Util',
           'JBrowse/Store/LRUCache',
           'jszlib/arrayCopy'
       ],
       function(
           declare,
           lang,
           array,
           Deferred,
           has,
           Util,
           LRUCache,
           arrayCopy
       ) {

var Chunk = Util.fastDeclare({
    constructor: function( values ) {
        lang.mixin( this, values );
    },
    toString: function() {
        return this.url+" (bytes "+this.start+".."+this.end+")";
    },
    toUniqueString: function() {
        return this.url+" (bytes "+this.start+".."+this.end+")";
    }
});

// contains chunks of files, stitches them together if necessary, wraps, and returns them
// to satisfy requests
return declare( null,

/**
 * @lends JBrowse.Store.RemoteBinaryFile
 */
{
    constructor: function( args ) {
        this.name = args.name;

        this._fetchCount = 0;
        this._arrayCopyCount = 0;

        this.minChunkSize = 'minChunkSize' in args ? args.minChunkSize : 32768;
        this.chunkCache = new LRUCache({
            name: args.name + ' chunk cache',
            maxSize: args.maxSize || 10000000 // 10MB max cache size
        });

        this.totalSizes = {};
    },

    _escapeRegExp: function(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    },

    _relevantExistingChunks: function( url, start, end ) {
        // we can't actually use any existing chunks if we don't have an
        // end defined.  not possible in the HTTP spec to ask for all except
        // the first X bytes of a file
        if( !end )
            return [];

        start = start || 0;

        var fileChunks = this.chunkCache
                .query( new RegExp( '^'+this._escapeRegExp( url + ' (bytes' ) ) );

        // set 'start' and 'end' on any records that don't have them, but should
        array.forEach( fileChunks, function(c) {
                           if( c.size ) {
                               if( ! c.key.start )
                                   c.key.start = 0;
                               if( ! c.key.end )
                                   c.key.end = c.key.start + ( c.size || c.value.byteLength );
                           }
                       });

        // sort the records by start coordinate, then by length descending (so that we preferentially use big chunks)
        fileChunks = fileChunks.sort( function( a, b ) {
            return ( a.key.start - b.key.start ) || ((b.key.end - b.key.start) - ( a.key.end - a.key.start ));
        });

        // filter for the chunks that can actually be used for this request
        return array.filter( fileChunks,
                             function( chunk ) {
                                 return !( chunk.key.start > end || chunk.key.end < start );
                             }, this);
    },

    _fetchChunks: function( url, start, end, callback, errorCallback, fetchCallback ) {
        var thisB = this;

        start = start || 0;

        // if we already know how big the file is, use that information for the end
        if( typeof end != 'number' && this.totalSizes[url] ) {
            end = this.totalSizes[ url ]-1;
        }
        // if we know the size of the file, and end is beyond it, then clamp it
        else if( end >= this.totalSizes[url] ) {
            end = this.totalSizes[url] - 1;
        }
        // NOTE: if end is undefined, we take that to mean fetch all the way to the end of the file

        // what chunks do we already have in the chunk cache?
        var existingChunks = this._relevantExistingChunks( url, start, end );
        this._log( 'existing', existingChunks );

        // assemble a 'golden path' of chunks to use to fulfill this
        // request, using existing chunks where we have them cached,
        // and where we don't, making records for chunks to fetch
        var goldenPath = [];
        if( typeof end != 'number' ) { // if we don't have an end coordinate, we just have to fetch the whole file
            goldenPath.push({ key: new Chunk( { url: url, start: 0, end: undefined } ) });
        }
        else {
            for( var currOffset = start; currOffset <= end; currOffset = goldenPath[goldenPath.length-1].key.end+1 ) {
                if( existingChunks[0] && existingChunks[0].key.start <= currOffset ) {
                    goldenPath.push( existingChunks.shift() );
                } else {
                    goldenPath.push({ key: new Chunk({
                                          url: url,
                                          start: currOffset,
                                          end: existingChunks[0] ? existingChunks[0].key.start-1 : end
                                      })
                                    });
                }
            }
        }

        // filter the blocks in the golden path that
        // have not already been fetched to try to align them to chunk boundaries: multiples of minChunkSize
        array.forEach( goldenPath, function( c ) {
                           if( c.value )
                               return;
                           var k = c.key;
                           k.start = Math.floor( k.start / this.minChunkSize ) * this.minChunkSize;
                           if( k.end )
                               k.end = Math.ceil( (k.end+1) / this.minChunkSize ) * this.minChunkSize - 1;
                       }, this );

        // merge and filter request blocks in the golden path
        goldenPath = this._optimizeGoldenPath( goldenPath );

        var needToFetch = array.filter( goldenPath, function(n) { return ! n.value; });

        this._log( 'need to fetch', needToFetch );

        function tryFetch( d, chunk, attempt ) {
            fetchCallback( chunk.url, chunk.start, chunk.end )
                .then( function( data ) {

                           // try to get the total size of the file from the Content-Range header and remember it
                           try {
                               if( !( data.url in thisB.totalSizes )) {
                                   thisB.totalSizes[ data.url ] = function() {
                                       var contentRange = data.req.getResponseHeader('Content-Range');
                                       if( ! contentRange )
                                           return undefined;
                                       var match = contentRange.match(/\/(\d+)$/);
                                       //console.log( 'size of '+data.url+' is '+match[1]);
                                       return match ? parseInt(match[1]) : undefined;
                                   }.call();
                               }
                           } catch(e) {console.error(''+e, e.stack);}

                           d.resolve( data );
                       },
                       function( error ) {
                           // retry 416 (bad range) once
                           var shouldRetry = error.xhr.status == 416;
                           if( shouldRetry )
                               tryFetch( d, chunk, attempt+1 );
                           else
                               d.reject( error );
                       });
        };

        // now fetch all the needed chunks
        // remember that chunk records in the 'needToFetch' array are also
        // present in the 'goldenPath' array, so setting their value
        // will affect both places
        if( needToFetch.length ) {
            var fetchedCount = 0;
            array.forEach( needToFetch, function( c ) {
                this.chunkCache.get(
                    c.key,
                    function( data, error ) {
                        c.value = data;
                        if( error ) {
                            errorCallback( error );
                        }
                        else if( ++fetchedCount == needToFetch.length )
                            callback( goldenPath );
                    },
                    function( chunk, callback ) {
                        var d = new Deferred();
                        tryFetch( d, chunk, 1 );
                        d.then( callback, function( e ) { callback( null, e ); } );
                        return d;
                    }
                );
            }, this );
        }
        // or we might already have all the chunks we need
        else {
            callback( goldenPath );
        }
    },

    _optimizeGoldenPath: function( goldenPath ) {
        var goldenPath2 = [ goldenPath[0] ];
        for( var i = 1; i<goldenPath.length; i++ ) {
            var chunk = goldenPath[i];
            var prev = goldenPath[i-1];
            var lastGolden = goldenPath2[ goldenPath2.length-1];

            if( chunk.value ) { // use an existing chunk if it is not rendered superfluous by the previous chunk
                if( chunk.key.end > lastGolden.key.end )
                    goldenPath2.push( chunk );
                // else don't use this chunk
            }
            else {
                // if the last thing on the golden path is also
                // something we need to fetch, merge with it
                if( ! lastGolden.value ) {
                    lastGolden.key.end = chunk.key.end;
                }
                // otherwise, use this fetch
                else {
                    goldenPath2.push( chunk );
                }
            }
        }
        return goldenPath2;
    },

    _fetch: function( request, callback, fillCallback, attemptNumber, truncatedLength ) {

        this._log( 'fetch', request.url, request.start, request.end );
        this._fetchCount++;

        attemptNumber = attemptNumber || 1;
    },

    /**
     * @param key     {String|Object} unique resource identifier, such as the URL being fetched
     * @param start   {Number|undefined} start byte offset
     * @param end     {Number|undefined} end byte offset
     * @param fetch   {Function} fetch callback, signature ( url, startbyte, endbyte ), returns Deferred value
     */
    get: function( key, start, end, fetch ) {
        var d = new Deferred();
        var resolve = lang.hitch( d, 'resolve' );
        var reject = lang.hitch( d, 'reject' );

        if( ! has('typed-arrays') ) {
            d.reject('This web browser lacks support for JavaScript typed arrays.');
            return d;
        }

        if( /^\[object /i.test( key ) )
            throw new Error( "key must either be a unique string, or have a toString method that returns a unique string" );

        this._log( 'get', key, start, end );

        start = start || 0;
        if( start && !end )
            throw "cannot specify a fetch start without a fetch end";

        if( start < 0 )
            throw "start cannot be negative!";
        if( end < 0 )
            throw "end cannot be negative!";

        this._fetchChunks(
            key,
            start,
            end,
            lang.hitch( this,  function( chunks ) {
                 var totalSize = this.totalSizes[ key ];

                 this._assembleChunks(
                         start,
                         end,
                         function( resultBuffer ) {
                             if( typeof totalSize == 'number' )
                                 resultBuffer.fileSize = totalSize;

                             resolve( resultBuffer );
                         },
                         reject,
                         chunks
                 );
            }),
            reject,
            fetch
        );

        return d;
    },

    _assembleChunks: function( start, end, successCallback, failureCallback, chunks ) {
        this._log( 'golden path', chunks);

        var returnBuffer;

        if( ! has('typed-arrays') ) {
            failureCallback( 'Web browser does not support typed arrays');
            return;
        }

        // if we just have one chunk, return either it, or a subarray of it.  don't have to do any array copying
        if( chunks.length == 1 && chunks[0].key.start == start && (!end || chunks[0].key.end == end) ) {
            returnBuffer = chunks[0].value;
        } else {

            // calculate the actual range end from the chunks we're
            // using, can't always trust the `end` we're passed,
            // because it might actually be beyond the end of the
            // file.
            var fetchEnd = Math.max.apply(
                Math,
                array.map(
                    chunks,
                    function(c) {
                        return c.key.start + ((c.value||{}).byteLength || 0 ) - 1;
                    })
            );

            // if we have an end, we shouldn't go larger than it, though
            if( end )
                fetchEnd = Math.min( fetchEnd, end );

            var fetchLength = fetchEnd - start + 1;

            // stitch them together into one ArrayBuffer to return
            returnBuffer = new Uint8Array( fetchLength );
            var cursor = 0;
            array.forEach( chunks, function( chunk ) {
                if( !( chunk.value && chunk.value.byteLength ) ) // skip if the chunk has no data
                    return;

                var b = new Uint8Array( chunk.value );
                var bOffset = (start+cursor) - chunk.key.start; if( bOffset < 0 ) this._error('chunking error');
                var length = Math.min( b.byteLength - bOffset, fetchLength - cursor );
                this._log( 'arrayCopy', b, bOffset, returnBuffer, cursor, length );
                arrayCopy( b, bOffset, returnBuffer, cursor, length );
                this._arrayCopyCount++;
                cursor += length;
            },this);
            returnBuffer = returnBuffer.buffer;
        }

        // return the data buffer
        successCallback( returnBuffer );
    },

    _log: function() {
        //console.log.apply( console, this._logf.apply(this,arguments) );
    },
    _warn: function() {
        console.warn.apply( console, this._logf.apply(this,arguments) );
    },
    _error: function() {
        console.error.apply( console,  this._logf.apply(this,arguments) );
        throw new Error('file error');
    },
    _logf: function() {
        arguments[0] = this.name+' '+arguments[0];
        if( typeof arguments[0] == 'string' )
            while( arguments[0].length < 15 )
                arguments[0] += ' ';
        return arguments;
    }

});
});