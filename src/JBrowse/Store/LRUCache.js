define([
           'dojo/_base/declare',
           'dojo/_base/array'
       ],
       function( declare, array ) {

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
        var key = this._keyString( inKey );

        var record = this._cacheByKey[ key ];
        if( !record ) {
            // call our fill callback if necessary

            this._log( 'miss', key );

            this._attemptFill( inKey, key, callback );

            return;
        }

        this._log( 'hit', key, record.value );

        // take it out of the linked list
        if( record.prev )
            record.prev.next = record.next;
        if( record.next )
            record.next.prev = record.prev;

        // add it back into the list as newest
        record.next = null;
        record.prev = this._cacheNewest;
        if( this._cacheNewest )
            this._cacheNewest.next = record;
        this._cacheNewest = record;

        callback( record.value );
    },

    _attemptFill: function( inKey, key, callback ) {
        if( this.fill ) {
            var fillRecord = this._inProgressFills[ key ] || { callbacks: [], running: false };
            fillRecord.callbacks.push( callback );
            if( ! fillRecord.running ) {
                fillRecord.running = true;
                this.fill( inKey, dojo.hitch( this, function( value ) {
                    delete this._inProgressFills[ key ];

                    if( value ) {
                        this._log( 'fill', key );
                        this.set( inKey, value );
                    }
                    array.forEach( fillRecord.callbacks, function( cb ) {
                                       cb.call(this, value);
                                   }, this );
                }));
                this._inProgressFills[ key ] = fillRecord;
            }
        }
        else {
            this._log( "can't fill", key );
            callback( undefined );
        }
    },

    set: function( inKey, value ) {
        var key = this._keyString( inKey );
        if( this._cacheByKey[key] ) {
            return;
        }

        // make a cache record for it
        var record = {
            value: value,
            key: key,
            size: this._size( value )
        };

        if( record.size > this.maxSize ) {
            this._warn( 'not caching', key, '('+record.size + ' > ' + this.maxSize+')' );
            return;
        }

        this._log( 'set', key, record, this.size );

        // evict items if necessary
        this._prune( record.size );

        // put it in the byKey structure
        this._cacheByKey[key] = record;

        // put it in the doubly-linked list
        record.prev = this._cacheNewest;
        if( this._cacheNewest )
            this._cacheNewest.next = record;
        this._cacheNewest = record;
        if( ! this._cacheOldest )
            this._cacheOldest = record;

        // update our total size and item count
        this.size += record.size;
        this.itemCount++;

        return;
    },

    _keyString: function( key ) {
        var type = typeof key;
        if( type == 'object' && typeof key.toString == 'function' ) {
            return key.toString();
        }
        else {
            return ''+key;
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

                // update the oldest and newest pointers
                if( ! oldest.next ) // if this was also the newest
                    this._cacheNewest = oldest.prev; // probably undef
                this._cacheOldest = oldest.next; // maybe undef

                // take it out of the linked list
                if( oldest.prev )
                    oldest.prev.next = oldest.next;
                if( oldest.next )
                    oldest.next.prev = oldest.prev;

                // delete it from the byKey structure
                delete this._cacheByKey[ oldest.key ];

                // remove its linked-list links in case that makes it
                // easier for the GC
                delete oldest.next;
                delete oldest.prev;

                // update our size and item counts
                this.itemCount--;
                this.size -= oldest.size;
            } else {
                // should usually not be reached
                this._error( "eviction error", this.size, newItemSize );
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