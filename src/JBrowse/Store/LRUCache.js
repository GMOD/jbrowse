define([
           'dojo/_base/declare'
       ],
       function( declare ) {

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
        this.maxSize = args.maxSize || 100000;

        this._size = args.sizeFunction || this._size;
        this._keyString = args.keyFunction || this._keyString;

        this.itemCount = 0;
        this.size = 0;

        this._cacheByKey = {};

        // each end of a doubly-linked list, sorted in usage order
        this._cacheOldest = null;
        this._cacheNewest = null;
    },

    get: function( inKey ) {
        var key = this._keyString( inKey );

        var record = this._cacheByKey[ key ];
        if( !record ) {
            // call our fill callback if necessary
            if( this.fill ) {
                var val = this.fill( inKey );
                if( val )
                    return this.set( inKey, val );
            }
            return null;
        }

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

        return record.value;
    },

    set: function( inKey, value ) {
        var key = this._keyString( inKey );
        if( this._cacheByKey[key] ) {
            return this.get( inKey );
        }

        // make a cache record for it
        var record = {
            value: value,
            key: key,
            size: this._size( value )
        };

        // evict items if necessary
        this._prune( record.size );

        // put it in the byKey structure
        this._cacheByKey[key] = value;

        // put it in the doubly-linked list
        record.prev = this._cacheNewest;
        this._cacheNewest.next = record;
        this._cacheNewest = record;
        if( ! this._cacheOldest )
            this._cacheOldest = record;

        // update our total size and item count
        this.size += record.size;
        this.itemCount++;

        return value;
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
        var type = typeof key;
        if( typeof value == 'object' ) {
            throw 'not implemented';
        } else {
            return 1;
        }
    },

    _prune: function( newItemSize ) {
        while( this.size + newItemSize > this.maxSize ) {
            var oldest = this._cacheOldest;
            if( oldest ) {
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
                // should not be reached
                throw "what is this i don't even";
            }
        }
    }
});
});