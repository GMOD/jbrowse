define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/Store/LRUCache',
           'jszlib/arrayCopy'
       ],
       function( declare, array, LRUCache, arrayCopy ) {

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
        this.minChunkSize = 'minChunkSize' in args ? args.minChunkSize : 65536;
        this.chunkCache = new LRUCache({
            name: args.name + ' chunk cache',
            fillCallback: dojo.hitch( this, '_fetch' )
        });
    },

    _escapeRegExp: function(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    },

    _relevantExistingChunks: function( url, start, end ) {
        var chunks =
            this.chunkCache
                .query( new RegExp( '^'+this._escapeRegExp( url ) ) )
                .sort( function( a, b ) {
                     // sort by start coordinate, then by length descending
                     return ( a.key.start - b.key.start ) || ((b.key.end - b.key.start) - ( a.key.end - a.key.start ));
                 });
        // extract the cache records' keys and sort by start offset,
        // then descending by length (so that we preferentially use
        // big chunks)
        return array.filter( chunks,
                             function( chunk ) {
                                 return ! ( chunk.key.start > end || chunk.key.end < start );
                             });
    },

    _fetchChunks: function( url, start, end, callback ) {
        // what chunks do we already have in the chunk cache?
        var existingChunks = this._relevantExistingChunks( url, start, end );
        this._log( 'existing', existingChunks );

        var needed = [];
        var currIndex = start;
        var goldenPath = [];
        var chunkToString = function() {
            return this.url+" (bytes "+this.start+".."+this.end+")";
        };

        if( existingChunks.length ) {
            array.forEach( existingChunks, function( chunk, i ) {
                               if( currIndex > end ) {
                                   return;
                               }
                               else if( chunk.key.start > currIndex ) {
                                   // we need to get a chunk for this range
                                   var needed = {
                                       key: {
                                           url:   url,
                                           start: currIndex,
                                           end:   currIndex + Math.max( this.minChunkSize, chunk.key.start - currIndex ) - 1,
                                           toString: chunkToString
                                       }
                                   };
                                   needed.push( needed );
                                   goldenPath.push( needed );
                               }
                               else if( chunk.key.end >= currIndex ) {
                                   // we'll use this chunk
                                   this.chunkCache.touch( chunk );
                                   goldenPath.push( chunk );
                               }
                               else {
                                   console.error( currIndex, chunk, i, existingChunks );
                                   throw 'should not be reached';
                               }
                               currIndex = goldenPath[ goldenPath.length-1 ].key.end + 1;
                           },this);
        }
        else {
            needed.push({ key: {
                              url: url,
                              start: start,
                              end: Math.max( start+this.minChunkSize-1, end ),
                              toString: chunkToString
                          }
                        });
        }

        this._log( 'needed', needed );

        // now fetch all the needed chunks
        // remember that chunk records in the 'needed' array are also
        // present in the 'goldenPath' array, so setting their value
        // will affect both places
        if( needed.length ) {
            var fetchedCount = 0;
            array.forEach( needed, function( c ) {
                this.chunkCache.get( c.key, dojo.hitch( function( data ) {
                    c.value = data;
                    if( ++fetchedCount == needed.length )
                        callback( goldenPath );
                }));
            }, this );
        }
        // or we might have all the chunks we need
        else {
            callback( goldenPath );
        }
    },

    _fetch: function( request, callback, attempt, truncatedLength ) {

        this._log( 'fetch', request.url, request.start, request.end );
        this._fetchCount++;

        attempt = attempt || 1;
        if( attempt > 3 ) {
            callback(null);
            return;
        }

        var req = new XMLHttpRequest();
        var length;
        req.open('GET', request.url, true);
        if( req.overrideMimeType )
            req.overrideMimeType('text/plain; charset=x-user-defined');
        if (request.end) {
            req.setRequestHeader('Range', 'bytes=' + request.start + '-' + request.end);
            length = request.end - request.start + 1;
        }
        req.responseType = 'arraybuffer';
        req.onreadystatechange = dojo.hitch( function() {
            if (req.readyState == 4) {
                if (req.status == 200 || req.status == 206) {
                    // this.totalSize = (function() {
                    //     var contentRange = req.getResponseHeader('Content-Range');
                    //     if( ! contentRange )
                    //         return undefined;
                    //     var match = contentRange.match(/\/(\d+)$/);
                    //     return match ? parseInt(match[1]) : undefined;
                    // })();
                    // this.size = length || this.totalSize;

                    if (req.response) {
                        return callback(req.response);
                    } else if (req.mozResponseArrayBuffer) {
                        return callback(req.mozResponseArrayBuffer);
                    } else {
                        try{
                            var r = req.responseText;
                            if (length && length != r.length && (!truncatedLength || r.length != truncatedLength)) {
                                return this._fetch( request, callback, attempt + 1, r.length );
                            } else {
                                return callback( this._stringToBuffer(req.responseText) );
                            }
                        } catch (x) {
                            console.error(''+x);
                            callback( null );
                        }
                    }
                } else {
                    return this._fetch( request, callback, attempt + 1);
                }
            }
            return null;
        });
        // if (this.opts.credentials) {
        //     req.withCredentials = true;
        //  }
        req.send('');
    },

    /**
     * @param args.url
     * @param args.start
     * @param args.end
     * @param args.success
     */
    get: function( args ) {
        this._log( 'get', args.url, args.start, args.end );

        this._fetchChunks( args.url, args.start, args.end, dojo.hitch( this, function( chunks ) {
            var returnBuffer = new Uint8Array( args.end - args.start + 1 );

            // stitch them together into one ArrayBuffer to return
            var cursor = 0;
            array.forEach( chunks, function( chunk ) {
                var b = new Uint8Array( chunk.value );
                var bOffset = Math.max( 0, args.start - chunk.key.start );
                var length = Math.min( b.length - bOffset, returnBuffer.length - cursor );
                this._log( 'arrayCopy', b, bOffset, returnBuffer, cursor, length );
                arrayCopy( b, bOffset, returnBuffer, cursor, length );
                cursor += length;
            },this);

            // return the data buffer
            args.success( returnBuffer.buffer );
        }));
    },

    _stringToBuffer: function(result) {
        if( ! result || typeof Uint8Array != 'function' )
            return null;

        var ba = new Uint8Array( result.length );
        for ( var i = 0; i < ba.length; i++ ) {
            ba[i] = result.charCodeAt(i);
        }
        return ba.buffer;
    },

    _log: function() {
        console.log.apply( console, this._logf.apply(this,arguments) );
    },
    _warn: function() {
        console.warn.apply( console, this._logf.apply(this,arguments) );
    },
    _error: function() {
        console.error.apply( console, this._logf.apply(this,arguments) );
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