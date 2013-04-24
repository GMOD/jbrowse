define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/Store/LRUCache',
           'JBrowse/Model/XHRBlob',
           'JBrowse/Model/BGZip/BGZBlob',
           'JBrowse/Model/TabixIndex'
       ],
       function(
           declare,
           array,
           LRUCache,
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
    },

    getLines: function( ref, min, max, itemCallback, finishCallback, errorCallback ) {
        var thisB = this;
        var args = Array.prototype.slice.call(arguments);
        this.indexLoaded.then(function() {
            thisB._fetch.apply( thisB, args );
        }, errorCallback);
    },

    _fetch: function( ref, min, max, itemCallback, finishCallback, errorCallback ) {
        var regRef = this.browser.regularizeReferenceName( ref );

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

        var fetchError;
        try {
            this._fetchChunkData( chunks, function( items, error ) {
                if( fetchError )
                    return;

                if( error ) {
                    errorCallback( error );
                } else {
                    array.forEach( items, function(item) {
                        if( !( item.end < min || item.start > max )
                            && ( ref === undefined || item._regularizedRef == regRef ) ) {
                                itemCallback( item );
                            }
                    });
                    finishCallback();
                }
            });
        } catch( e ) {
            errorCallback( e );
        }
    },

    _fetchChunkData: function( chunks, callback ) {
        var thisB = this;

        if( ! chunks.length ) {
            callback([]);
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

        var error;
        array.forEach( chunks, function( c ) {
            cache.get( c, function( chunkItems, e ) {
                error = error || e;
                allItems.push.apply( allItems, chunkItems );
                if( ++chunksProcessed == chunks.length )
                    callback( allItems, error );
            });
        });
    },

    _readChunkItems: function( chunk, callback ) {
        var thisB = this;
        var items = [];

        thisB.data.read(chunk.minv.block, chunk.maxv.block - chunk.minv.block + 1, function( data ) {
            data = new Uint8Array(data);

            // throw away the first (probably incomplete) line
            var parseStart = array.indexOf( data, thisB._newlineCode, 0 ) + 1;

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
