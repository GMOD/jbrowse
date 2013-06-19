define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/Util',
           'JBrowse/Store/LRUCache',
           'JBrowse/Errors',
           'JBrowse/Model/XHRBlob',
           'JBrowse/Model/BGZip/BGZBlob',
           'JBrowse/Model/TabixIndex'
       ],
       function(
           declare,
           array,
           Util,
           LRUCache,
           Errors,
           XHRBlob,
           BGZBlob,
           TabixIndex
       ) {

return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser;
        this.index = new TabixIndex({ blob: new BGZBlob( args.tbi ), browser: args.browser } );
        this.data  = new BGZBlob( args.file );
        this.indexLoaded = this.index.load();

        this.chunkSizeLimit = args.chunkSizeLimit || 15000000;
    },

    getLines: function( ref, min, max, itemCallback, finishCallback, errorCallback ) {
        var thisB = this;
        var args = Array.prototype.slice.call(arguments);
        this.indexLoaded.then(function() {
            thisB._fetch.apply( thisB, args );
        }, errorCallback);
    },

    _fetch: function( ref, min, max, itemCallback, finishCallback, errorCallback ) {
        errorCallback = errorCallback || function(e) { console.error(e, e.stack); };

        var chunks = this.index.blocksForRange( ref, min, max);
        if ( ! chunks ) {
            errorCallback('Error in index fetch ('+[ref,min,max].join(',')+')');
            return;
        }

        // toString function is used by the cache for making cache keys
        chunks.toString = chunks.toUniqueString = function() {
            return this.join(', ');
        };

        // check the chunks for any that are over the size limit.  if
        // any are, don't fetch any of them
        for( var i = 0; i<chunks.length; i++ ) {
            var size = chunks[i].fetchedSize();
            if( size > this.chunkSizeLimit ) {
                errorCallback( new Errors.DataOverflow('Too much data. Chunk size '+Util.commifyNumber(size)+' bytes exceeds chunkSizeLimit of '+Util.commifyNumber(this.chunkSizeLimit)+'.' ) );
                return;
            }
        }

        var fetchError;
        try {
            this._fetchChunkData(
                chunks,
                ref,
                min,
                max,
                itemCallback,
                finishCallback,
                errorCallback
            );
        } catch( e ) {
            errorCallback( e );
        }
    },

    _fetchChunkData: function( chunks, ref, min, max, itemCallback, endCallback, errorCallback ) {
        var thisB = this;

        if( ! chunks.length ) {
            endCallback();
            return;
        }

        var allItems = [];
        var chunksProcessed = 0;

        var cache = this.chunkCache = this.chunkCache || new LRUCache({
            name: 'TabixIndexedFileChunkedCache',
            fillCallback: dojo.hitch( this, '_readChunkItems' ),
            sizeFunction: function( chunkItems ) {
                return chunkItems.length;
            },
            maxSize: 100000 // cache up to 100,000 items
        });

        var regRef = this.browser.regularizeReferenceName( ref );

        var haveError;
        array.forEach( chunks, function( c ) {
            cache.get( c, function( chunkItems, e ) {
                if( e && !haveError )
                    errorCallback( e );
                if(( haveError = haveError || e )) {
                    return;
                }

                for( var i = 0; i< chunkItems.length; i++ ) {
                    var item = chunkItems[i];
                    if( item._regularizedRef == regRef ) {
                        // on the right ref seq
                        if( item.start > max ) // past end of range, can stop iterating
                            break;
                        else if( item.end >= min ) // must be in range
                            itemCallback( item );
                    }
                }
                if( ++chunksProcessed == chunks.length ) {
                    endCallback();
                }
            });
        });
    },

    _readChunkItems: function( chunk, callback ) {
        var thisB = this;
        var items = [];

        thisB.data.read(chunk.minv.block, chunk.maxv.block - chunk.minv.block + 1, function( data ) {
            data = new Uint8Array(data);

            // throw away the first (probably incomplete) line
            var parseStart = chunk.minv.block ? array.indexOf( data, thisB._newlineCode, 0 ) + 1 : 0;

            try {
                thisB.parseItems(
                    data,
                    parseStart,
                    function(i) { items.push(i); },
                    function() { callback(items); }
                );
            } catch( e ) {
                callback( null, e );
            }
        },
        function(e) {
            callback( null, e );
        });
    },

    parseItems: function( data, blockStart, itemCallback, finishCallback ) {
        var that = this;
        var itemCount = 0;

        var maxItemsWithoutYielding = 300;
        var parseState = { data: data, offset: blockStart };

        while ( true ) {
            // if we've read no more than a certain number of items this cycle, read another one
            if( itemCount <= maxItemsWithoutYielding ) {
                var item = this.parseItem( parseState ); //< increments parseState.offset
                if( item ) {
                    itemCallback( item );
                    itemCount++;
                }
                else {
                    finishCallback();
                    return;
                }
            }
            // if we're not done but we've read a good chunk of
            // items, schedule the rest of our work in a timeout to continue
            // later, avoiding blocking any UI stuff that needs to be done
            else {
                window.setTimeout( function() {
                    that.parseItems( data, parseState.offset, itemCallback, finishCallback );
                }, 1);
                return;
            }
        }
    },

    // stub method, override in subclasses or instances
    parseItem: function( parseState ) {
        var metaChar = this.index.metaChar;

        var line;
        do {
            line = this._getline( parseState );
        } while( line && line[0] == metaChar );

        if( !line )
            return null;

        // function extractColumn( colNum ) {
        //     var skips = '';
        //     while( colNum-- > 1 )
        //         skips += '^[^\t]*\t';
        //     var match = (new Regexp( skips+'([^\t]*)' )).exec( line );
        //     if( ! match )
        //         return null;
        //     return match[1];
        // }
        var fields = line.split( "\t" );
        var item = { // note: index column numbers are 1-based
            ref:   fields[this.index.columnNumbers.ref-1],
            _regularizedRef: this.browser.regularizeReferenceName( fields[this.index.columnNumbers.ref-1] ),
            start: parseInt(fields[this.index.columnNumbers.start-1]),
            end:   parseInt(fields[this.index.columnNumbers.end-1]),
            fields: fields
        };
        return item;
    },

    _newlineCode: "\n".charCodeAt(0),

    _getline: function( parseState ) {
        var data = parseState.data;
        var newlineIndex = array.indexOf( data, this._newlineCode, parseState.offset );

        if( newlineIndex == -1 ) // no more lines
            return null;

        var line = '';
        for( var i = parseState.offset; i < newlineIndex; i++ )
            line += String.fromCharCode( data[i] );
        parseState.offset = newlineIndex+1;
        return line;
    }
});
});
