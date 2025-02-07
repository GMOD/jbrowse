define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'JBrowse/Util',
  'JBrowse/Digest/Crc32',
], function (declare, array, Util, digest) {
  return declare(
    null,

    /**
     * @lends JBrowse.Store.LRUCache
     */
    {
      /**
       * An LRU cache.
       *
       * @param args.fillCallback
       * @param args.maxSize
       * @param args.sizeFunction
       * @param args.keyFunction
       * @param args.name
       * @param args.verbose
       * @constructs
       */
      constructor: function (args) {
        this.fill = args.fillCallback
        this.maxSize = args.maxSize || 1000000

        this.verbose = args.verbose

        this.name = args.name || 'LRUcache'

        this._size = args.sizeFunction || this._size
        this._keyString = args.keyFunction || this._keyString

        this.itemCount = 0
        this.size = 0

        this._cacheByKey = {}

        // each end of a doubly-linked list, sorted in usage order
        this._cacheOldest = null
        this._cacheNewest = null

        // we aggregate cache fill calls that are in progress, indexed
        // by cache key
        this._inProgressFills = {}
      },

      get: function (inKey, callback) {
        var keyString = this._keyString(inKey)
        var record = this._cacheByKey[keyString]

        if (!record) {
          this._log('miss', keyString)

          // call our fill callback if we can
          this._attemptFill(inKey, keyString, callback)
          return
        } else {
          this._log('hit', keyString)
          this.touchRecord(record)
          window.setTimeout(function () {
            callback(record.value)
          }, 1)
        }
      },

      query: function (keyRegex) {
        var results = []
        var cache = this._cacheByKey
        for (var k in cache) {
          if (keyRegex.test(k) && cache.hasOwnProperty(k))
            results.push(cache[k])
        }
        return results
      },

      forEach: function (func, context) {
        if (!context) context = this
        var i = 0
        for (var record = this._cacheNewest; record; record = record.next) {
          func.call(context, record, i++)
        }
      },
      some: function (func, context) {
        if (!context) context = this
        var i = 0
        for (var record = this._cacheNewest; record; record = record.next) {
          if (func.call(context, record, i++)) return true
        }
        return false
      },

      touch: function (inKey) {
        this.touchRecord(this._cacheByKey[this._keyString(inKey)])
      },

      touchRecord: function (record) {
        if (!record) return

        // already newest, nothing to do
        if (this._cacheNewest === record) return

        // take it out of the linked list
        this._llRemove(record)

        // add it back into the list as newest
        this._llPush(record)
      },

      // take a record out of the LRU linked list
      _llRemove: function (record) {
        if (record.prev) record.prev.next = record.next
        if (record.next) record.next.prev = record.prev

        if (this._cacheNewest === record) this._cacheNewest = record.prev

        if (this._cacheOldest === record) this._cacheOldest = record.next

        record.prev = null
        record.next = null
      },

      _llPush: function (record) {
        if (this._cacheNewest) {
          this._cacheNewest.next = record
          record.prev = this._cacheNewest
        }
        this._cacheNewest = record
        if (!this._cacheOldest) this._cacheOldest = record
      },

      _attemptFill: function (inKey, keyString, callback) {
        if (this.fill) {
          var fillRecord = (this._inProgressFills[keyString] = this
            ._inProgressFills[keyString] || {
            callbacks: [],
            running: false,
          })

          fillRecord.callbacks.push(callback)

          if (!fillRecord.running) {
            fillRecord.running = true
            this.fill(
              inKey,
              dojo.hitch(
                this,
                function (keyString, inKey, fillRecord, value, error, hints) {
                  delete this._inProgressFills[keyString]
                  fillRecord.running = false

                  if (value && !(hints && hints.nocache)) {
                    this._log('fill', keyString)
                    this.set(inKey, value)
                  }
                  array.forEach(
                    fillRecord.callbacks,
                    function (cb) {
                      try {
                        cb.call(this, value, error)
                      } catch (x) {
                        console.error('' + x, x.stack, x)
                      }
                    },
                    this,
                  )
                },
                keyString,
                inKey,
                fillRecord,
              ),
            )
          }
        } else {
          try {
            callback(undefined)
          } catch (x) {
            console.error(x)
          }
        }
      },

      set: function (inKey, value) {
        var keyString = this._keyString(inKey)
        if (this._cacheByKey[keyString]) {
          return
        }

        // make a cache record for it
        let size
        try {
          size = this._size(value)
        } catch (e) {
          e.message = `Error calculating item size: ${e.message}`
          console.error(e)
          size = 1
        }
        var record = {
          value: value,
          key: inKey,
          keyString: keyString,
          size: size,
        }

        if (record.size > this.maxSize) {
          this._warn(
            'Cache cannot fit',
            keyString,
            '(' +
              Util.addCommas(record.size) +
              ' > ' +
              Util.addCommas(this.maxSize) +
              ')',
          )
          return
        }

        this._log('set', keyString, record, this.size)

        // evict items if necessary
        this._prune(record.size)

        // put it in the byKey structure
        this._cacheByKey[keyString] = record

        // put it in the doubly-linked list
        this._llPush(record)

        // update our total size and item count
        this.size += record.size
        this.itemCount++

        return
      },

      _keyString: function (inKey) {
        var type = typeof inKey
        if (type == 'object' && typeof inKey.toUniqueString == 'function') {
          return inKey.toUniqueString()
        } else {
          return digest.objectFingerprint(inKey)
        }
      },

      _size: function (value) {
        var type = typeof value
        var sum = 0
        if (type == 'object' && type !== null) {
          var sizeType = typeof value.size
          if (sizeType == 'number') {
            return sizeType
          } else if (sizeType == 'function') {
            return value.size()
          } else if (value.byteLength) {
            return value.byteLength
          } else {
            for (var k in value) {
              if (value.hasOwnProperty(k)) {
                sum += this._size(value[k])
              }
            }
          }
          return sum
        } else if (type == 'string') {
          return value.length
        } else {
          return 1
        }
      },

      _prune: function (newItemSize) {
        while (this.size + (newItemSize || 0) > this.maxSize) {
          var oldest = this._cacheOldest
          if (oldest) {
            this._log('evict', oldest)

            // // update the oldest and newest pointers
            // if( ! oldest.next ) // if this was also the newest
            //     this._cacheNewest = oldest.prev; // probably undef
            // this._cacheOldest = oldest.next; // maybe undef

            // take it out of the linked list
            this._llRemove(oldest)

            // delete it from the byKey structure
            delete this._cacheByKey[oldest.keyString]

            // remove its linked-list links in case that makes it
            // easier for the GC
            delete oldest.next
            delete oldest.prev

            // update our size and item counts
            this.itemCount--
            this.size -= oldest.size
          } else {
            // should usually not be reached
            this._error('eviction error', this.size, newItemSize, this)
            return
          }
        }
      },

      _log: function () {
        if (this.verbose) console.log.apply(console, arguments)
      },
      _warn: function () {
        console.warn.apply(console, arguments)
      },
      _error: function () {
        console.error.apply(console, arguments)
      },
    },
  )
})
