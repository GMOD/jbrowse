define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/Util'
       ],
       function( declare, array, Util ) {

return declare( null,

/**
 * @lends JBrowse.Store.LRUCache
 */
{

    /**
     * An LRU cache.
     *
     * @param args.fill
     * @param args.maxSize
     * @param args.sizeFunction
     * @param args.keyFunction
     * @param args.name
     * @constructs
     */
    constructor: function( args ) {
        this.fill = args.fillCallback;
        this.maxSize = args.maxSize || 1000000;

        this.name = args.name || 'cache';

        this._size = args.sizeFunction || this._size;
        this._keyString = args.keyFunction || this._keyString;

        this.itemCount = 0;
        this.size = 0;

        this._cacheByKey = {};

        // each end of a doubly-linked list, sorted in usage order
        this._cacheOldest = null;
        this._cacheNewest = null;

        // we aggregate cache fill calls that are in progress, indexed
        // by cache key
        this._inProgressFills = {};
    },

    get: function( inKey, callback ) {
        var keyString = this._keyString( inKey );
        var record = this._cacheByKey[ keyString ];

        if( !record ) {
            this._log( 'miss', keyString );

            // call our fill callback if we can
            this._attemptFill( inKey, keyString, callback );
            return;

        } else {
            this._log( 'hit', keyString, record.value );
            this._touch( record );
            window.setTimeout( function() {
                callback( record.value );
            }, 1 );
        }
    },

    query: function( keyRegex ) {
        var results = [];
        var cache = this._cacheByKey;
        for( var k in cache ) {
            if( keyRegex.test( k ) && cache.hasOwnProperty(k) )
                results.push( cache[k] );
        }
        return results;
    },

    touch: function( inKey ) {
        this._touch( this._cacheByKey[ this._keyString( inKey ) ] );
    },
    _touch: function( record ) {
        if( ! record )
            return;

        // already newest, nothing to do
        if( this._cacheNewest === record )
            return;

        // take it out of the linked list
        this._llRemove( record );

        // add it back into the list as newest
        this._llPush( record );
    },

    // take a record out of the LRU linked list
    _llRemove: function( record ) {
        if( record.prev )
            record.prev.next = record.next;
        if( record.next )
            record.next.prev = record.prev;

        if( this._cacheNewest === record )
            this._cacheNewest = record.prev;

        if( this._cacheOldest === record )
            this._cacheOldest = record.next;

        record.prev = null;
        record.next = null;
    },

    _llPush: function( record ) {
        if( this._cacheNewest ) {
            this._cacheNewest.next = record;
            record.prev = this._cacheNewest;
        }
        this._cacheNewest = record;
        if( ! this._cacheOldest )
            this._cacheOldest = record;
    },

    _attemptFill: function( inKey, keyString, callback ) {
        if( this.fill ) {
            var fillRecord = this._inProgressFills[ keyString ] || { callbacks: [], running: false };
            fillRecord.callbacks.push( callback );
            if( ! fillRecord.running ) {
                fillRecord.running = true;
                this.fill( inKey, dojo.hitch( this, function( keyString, inKey, fillRecord, value ) {
                    delete this._inProgressFills[ keyString ];
                    fillRecord.running = false;

                    if( value ) {
                        this._log( 'fill', keyString );
                        this.set( inKey, value );
                    }
                    array.forEach( fillRecord.callbacks, function( cb ) {
                                       //try {
                                           cb.call(this, value);
                                       // } catch(x) {
                                       //     console.error(x);
                                       // }
                                   }, this );
                }, keyString, inKey, fillRecord ));
            }
            this._inProgressFills[ keyString ] = fillRecord;
        }
        else {
            try {
                callback( undefined );
            } catch(x) {
                console.error(x);
            }
        }
    },

    set: function( inKey, value ) {
        var keyString = this._keyString( inKey );
        if( this._cacheByKey[keyString] ) {
            return;
        }

        // make a cache record for it
        var record = {
            value: value,
            key: inKey,
            keyString: keyString,
            size: this._size( value )
        };

        if( record.size > this.maxSize ) {
            this._warn( 'cannot fit', keyString, '('+Util.addCommas(record.size) + ' > ' + Util.addCommas(this.maxSize)+')' );
            return;
        }

        this._log( 'set', keyString, record, this.size );

        // evict items if necessary
        this._prune( record.size );

        // put it in the byKey structure
        this._cacheByKey[keyString] = record;

        // put it in the doubly-linked list
        this._llPush( record );

        // update our total size and item count
        this.size += record.size;
        this.itemCount++;

        return;
    },

    _keyString: function( inKey ) {
        var type = typeof inKey;
        if( type == 'object' && typeof inKey.toString == 'function' ) {
            return inKey.toString();
        }
        else {
            return ''+inKey;
        }
    },

    _size: function( value ) {
        var type = typeof value;
        if( type == 'object' ) {
            var sizeType = typeof value.size;
            if( sizeType == 'number' ) {
                return sizeType;
            }
            else if( sizeType == 'function' ) {
                return value.size();
            }
            else if( value.byteLength ) {
                return value.byteLength;
            } else {
                var sum = 0;
                for( var k in value ) {
                    if( value.hasOwnProperty( k ) ) {
                        sum += this._size( value[k] );
                    }
                }
            }
            return sum;
        } else if( type == 'string' ) {
            return value.length;
        } else {
            return 1;
        }
    },

    _prune: function( newItemSize ) {
        while( this.size + (newItemSize||0) > this.maxSize ) {
            var oldest = this._cacheOldest;
            if( oldest ) {
                this._log( 'evict', oldest );

                // // update the oldest and newest pointers
                // if( ! oldest.next ) // if this was also the newest
                //     this._cacheNewest = oldest.prev; // probably undef
                // this._cacheOldest = oldest.next; // maybe undef

                // take it out of the linked list
                this._llRemove( oldest );

                // delete it from the byKey structure
                delete this._cacheByKey[ oldest.keyString ];

                // remove its linked-list links in case that makes it
                // easier for the GC
                delete oldest.next;
                delete oldest.prev;

                // update our size and item counts
                this.itemCount--;
                this.size -= oldest.size;
            } else {
                // should usually not be reached
                this._error( "eviction error", this.size, newItemSize, this );
                return;
            }
        }
    },

    _log: function() {
        //console.log.apply( console, this._logf.apply(this,arguments) );
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