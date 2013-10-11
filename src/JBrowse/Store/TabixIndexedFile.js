define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/promise/all',

           'JBrowse/Util',
           'JBrowse/Util/DeferredGenerator',
           'JBrowse/Util/TextIterator',
           'JBrowse/Store/LRUCache',
           'JBrowse/Errors',
           'JBrowse/Model/TabixIndex'
       ],
       function(
           declare,
           array,
           lang,
           all,

           Util,
           DeferredGenerator,
           TextIterator,
           LRUCache,
           Errors,
           TabixIndex
       ) {

return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser;
        this.index = new TabixIndex(
            { blob: args.tbi,
              browser: this.browser
            });
        this.data  = args.file;
        this.indexLoaded = this.index.load();

        this.chunkSizeLimit = args.chunkSizeLimit || 15000000;
    },

    getLines: function( ref, min, max ) {
        var thisB = this;
        var args = Array.prototype.slice.call(arguments);
        return new DeferredGenerator( function( generator ) {
            return thisB.indexLoaded
                       .then( function() {
                            return thisB._fetch.apply( thisB, args )
                                 .forEach( lang.hitch( generator, 'emit' ) );
                        });
        });
    },

    _fetch: function( ref, min, max ) {
        var chunks = this.index.blocksForRange( ref, min, max);
        if ( ! chunks )
            throw new Error('Error in index fetch ('+[ref,min,max].join(',')+')');

        // toString function is used by the cache for making cache keys
        chunks.toString = chunks.toUniqueString = function() {
            return this.join(', ');
        };

        // check the chunks for any that are over the size limit.  if
        // any are, don't fetch any of them
        for( var i = 0; i<chunks.length; i++ ) {
            var size = chunks[i].fetchedSize();
            if( size > this.chunkSizeLimit ) {
                throw new Errors.DataOverflow(
                    'Too much data. Chunk size '
                    +Util.commifyNumber(size)+' bytes exceeds chunkSizeLimit of '
                    +Util.commifyNumber(this.chunkSizeLimit)+'.'
                );
            }
        }

        return this._fetchChunkData(
                chunks,
                ref,
                min,
                max
            );
    },

    _fetchChunkData: function( chunks, ref, min, max ) {
        var thisB = this;

        if( ! chunks.length )
            return Util.resolved();

        var allItems = [];
        var chunksProcessed = 0;

        var cache = this.chunkCache = this.chunkCache || new LRUCache({
            name: 'TabixIndexedFileChunkedCache',
            sizeFunction: function( chunkItems ) {
                return chunkItems.length;
            },
            maxSize: 100000 // cache up to 100,000 items
        });

        var regRef = this.browser.regularizeReferenceName( ref );

        return new DeferredGenerator( function( generator ) {
            return all( array.map( chunks, function( c ) {
                   return cache.getD( c, lang.hitch( thisB, '_readChunkItems' ) )
                        .then( function( chunkItems ) {
                                   for( var i = 0; i< chunkItems.length; i++ ) {
                                       var item = chunkItems[i];
                                       if( item._regularizedRef == regRef ) {
                                           // on the right ref seq
                                           // past end of range, can stop iterating
                                           if( item.start > max )
                                               break;
                                           else if( item.end >= min ) // must be in range
                                           generator.emit( item );
                                       }
                                   }
                               });
                }));
        });
    },

    _readChunkItems: function( chunk ) {
        var thisB = this;

        return thisB.data.readRange(
            chunk.minv.block,
            chunk.maxv.block - chunk.minv.block + 1
        ).then( function( data ) {
                    // throw away the first (probably incomplete) line
                    var parseStart = chunk.minv.block
                        ? array.indexOf( data, thisB._newlineCode, 0 ) + 1
                        : 0;
                    var lineIterator = new TextIterator.FromBytes(
                        { bytes: data, offset: parseStart });

                    return new DeferredGenerator(
                        lang.hitch( thisB, '_parseItems', lineIterator )
                    ).collect();
                });
    },

    _parseItems: function( lineIterator, generator ) {
        var thisB = this;
        var itemCount = 0;

        var maxItemsWithoutYielding = 300;
        while ( true ) {
            // if we've read no more than a certain number of
            // items this cycle, read another one
            if( itemCount <= maxItemsWithoutYielding ) {
                var item = thisB.parseItem( lineIterator );
                if( item ) {
                    generator.emit( item );
                    itemCount++;
                }
                else {
                    generator.resolve();
                    return;
                }
            }
            // if we're not done but we've read a good chunk of
            // items, schedule the rest of our work in a timeout to continue
            // later, avoiding blocking any UI stuff that needs to be done
            else {
                window.setTimeout(
                    function() {
                        thisB._parseItems( lineIterator, generator );
                    }, 1);
                return;
            }
        }
    },

    parseItem: function( iterator ) {
        var metaChar = this.index.metaChar;
        var line, item;
        do {
            line = iterator.getline();
        } while( line && (    line.charAt(0) == metaChar // meta line, skip
                           || line.charAt( line.length - 1 ) != "\n" // no newline at the end, incomplete
                           || ! ( item = this.tryParseLine( line ) )   // line could not be parsed
                         )
               );

        if( line && item )
            return item;

        return null;
    },

    tryParseLine: function( line ) {
        try {
            return this.parseLine( line );
        } catch(e) {
            console.warn('parse failed: "'+line+'"');
            return null;
        }
    },

    parseLine: function( line ) {
        var fields = line.split( "\t" );
        fields[fields.length-1] = fields[fields.length-1].replace(/\n$/,''); // trim off the newline
        var item = { // note: index column numbers are 1-based
            ref:   fields[this.index.columnNumbers.ref-1],
            _regularizedRef: this.browser.regularizeReferenceName( fields[this.index.columnNumbers.ref-1] ),
            start: parseInt(fields[this.index.columnNumbers.start-1]),
            end:   parseInt(fields[this.index.columnNumbers.end-1]),
            fields: fields
        };
        return item;
    }

});
});
