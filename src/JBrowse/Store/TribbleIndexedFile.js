define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/Util',
           'JBrowse/Util/TextIterator',
           'JBrowse/Store/LRUCache',
           'JBrowse/Errors',
           'JBrowse/Model/XHRBlob',
           'JBrowse/Model/TribbleIndex'
       ],
       function(
           declare,
           array,
           Util,
           TextIterator,
           LRUCache,
           Errors,
           XHRBlob,
           TribbleIndex
       ) {

return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser;
        this.index = new TribbleIndex({ blob: args.idx, browser: args.browser } );
        this.data  = args.file;
        this.indexLoaded = this.index.load();

        this.chunkSizeLimit = args.chunkSizeLimit || 2000000;
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

        var blocks = this.index.blocksForRange( ref, min, max);
        if ( ! blocks ) {
            errorCallback('Error in index fetch ('+[ref,min,max].join(',')+')');
            return;
        }

        // toString function is used by the cache for making cache keys
        blocks.toString = blocks.toUniqueString = function() {
            return this.join(', ');
        };

        // check the chunks for any that are over the size limit.  if
        // any are, don't fetch any of them
        for( var i = 0; i<blocks.length; i++ ) {
            var size = blocks[i].length;
            if( size > this.chunkSizeLimit ) {
                errorCallback( new Errors.DataOverflow('Too much data. Chunk size '+Util.commifyNumber(size)+' bytes exceeds chunkSizeLimit of '+Util.commifyNumber(this.chunkSizeLimit)+'.' ) );
                return;
            }
        }

        var fetchError;
        try {
            this._fetchChunkData(
                blocks,
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
        if( ! chunks.length ) {
            endCallback();
            return;
        }

        var allItems = [];
        var chunksProcessed = 0;

        var cache = this.chunkCache = this.chunkCache || new LRUCache({
            name: 'TribbleIndexedFileChunkCache',
            fillCallback: this._readChunkItems.bind(this),
            sizeFunction: chunkItems => chunkItems.length,
            maxSize: 100000 // cache up to 100,000 items
        });

        var regRef = this.browser.regularizeReferenceName( ref );

        var haveError;
        chunks.forEach( c => {
            cache.get( c, function( chunkItems, e ) {
                if( e && !haveError )
                    errorCallback( e );
                if(( haveError = haveError || e )) {
                    return;
                }

                for( let i = 0; i< chunkItems.length; i++ ) {
                    const item = chunkItems[i];
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
        var items = [];

        this.data.read(chunk.offset, chunk.length, data => {
            data = new Uint8Array(data);
            //console.log( 'reading chunk %d compressed, %d uncompressed', chunk.maxv.block-chunk.minv.block+65536, data.length );
            var lineIterator = new TextIterator.FromBytes({ bytes: data, offset: 0 });
            try {
                this._parseItems(
                    lineIterator,
                    i => items.push(i),
                    () => callback(items),
                )
            } catch( e ) {
                callback( null, e )
            }
        },
        function(e) {
            callback( null, e );
        });
    },

    _parseItems: function( lineIterator, itemCallback, finishCallback ) {
        let itemCount = 0;

        const maxItemsWithoutYielding = 300;
        while ( true ) {
            // if we've read no more than a certain number of items this cycle, read another one
            if( itemCount <= maxItemsWithoutYielding ) {
                const item = this.parseItem( lineIterator );
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
                window.setTimeout( () => {
                    this._parseItems( lineIterator, itemCallback, finishCallback );
                }, 1);
                return;
            }
        }
    },

    parseItem: function( iterator ) {
        const metaChar = this.index.metaChar || '#'
        let line, item, fileOffset
        do {
            fileOffset = iterator.getOffset()
            line = iterator.getline()
        } while( line && (    line.charAt(0) == metaChar // meta line, skip
                           || line.charAt( line.length - 1 ) != "\n" // no newline at the end, incomplete
                           || ! ( item = this.tryParseLine( line, fileOffset ) )   // line could not be parsed
                         )
               )

        if (line && item) return item
        return null;
    },

    tryParseLine: function( line, fileOffset ) {
        try {
            return this.parseLine( line, fileOffset );
        } catch(e) {
            //console.warn('parse failed: "'+line+'"');
            return null;
        }
    },

    parseLine: function( line, fileOffset ) {
        var fields = line.split('\t')
        fields[fields.length-1] = fields[fields.length-1].replace(/\n$/,'') // trim off the newline
        const columnNumbers = this.getColumnNumbers()
        var item = { // note: index column numbers are 1-based
            ref:   fields[columnNumbers.ref-1],
            _regularizedRef: this.browser.regularizeReferenceName( fields[columnNumbers.ref-1] ),
            start: parseInt(fields[columnNumbers.start-1]),
            end:   parseInt(fields[columnNumbers.end-1]),
            fields: fields,
            fileOffset: fileOffset,
        };
        return item;
    }

});
});
