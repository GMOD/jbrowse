cjsRequire('whatwg-fetch')
const tenaciousFetch = cjsRequire('tenacious-fetch').default

const { HttpRangeFetcher } = cjsRequire('http-range-fetcher')
const { Buffer } = cjsRequire('buffer')

define([
  'dojo/_base/declare',
  'JBrowse/Util',
  'JBrowse/Model/FileBlob',
], function (declare, Util, FileBlob) {
  //throw 404 errors for plain-old-fetch xref https://github.com/github/fetch/issues/155
  function fetchwrapper(f) {
    return function (url, options) {
      return f(url, options).then(function (res) {
        if (res.status >= 200 && res.status < 300) {
          return Promise.resolve(res)
        } else {
          const error = new Error(`HTTP ${res.status} when fetching ${res.url}`)
          error.response = res
          return Promise.reject(error)
        }
      })
    }
  }
  function getfetch(url, opts = {}) {
    let mfetch
    if (Util.isElectron()) {
      if (url.slice(0, 4) === 'http') {
        mfetch = fetchwrapper(electronRequire('node-fetch'))
      } else {
        url = url.replace('%20', ' ')
        mfetch = fetchwrapper(fetch)
      }
    } else {
      mfetch = tenaciousFetch // already throws on 404
    }
    return mfetch(
      url,
      Object.assign(
        {
          method: 'GET',
          credentials: 'same-origin',
          retries: 5,
          retryDelay: 1000, // 1 sec, 2 sec, 3 sec
          retryStatus: [500, 404, 503],
          onRetry: ({ retriesLeft, retryDelay }) => {
            console.warn(
              `${url} request failed, retrying (${retriesLeft} retries left)`,
            )
          },
        },
        opts,
      ),
    )
  }

  function fetchBinaryRange(url, start, end) {
    const requestDate = new Date()
    const headers = {
      headers: { range: `bytes=${start}-${end}` },
      onRetry: ({ retriesLeft, retryDelay }) => {
        console.warn(
          `${url} bytes ${start}-${end} request failed, retrying (${retriesLeft} retries left)`,
        )
      },
    }

    return getfetch(url, headers).then(
      res => {
        const responseDate = new Date()
        if (res.status !== 206 && res.status !== 200) {
          throw new Error(
            `HTTP ${res.status} when fetching ${url} bytes ${start}-${end}`,
          )
        }

        // translate the Headers object into a regular key -> value object.
        // will miss duplicate headers of course
        const headers = {}
        for (let entry of res.headers.entries()) {
          headers[entry[0]] = entry[1]
        }

        if (Util.isElectron()) {
          // electron charmingly returns HTTP 200 for byte range requests,
          // and does not fill in content-range. so we will fill it in
          try {
            if (!headers['content-range']) {
              const fs = electronRequire('fs') //Load the filesystem module
              const stats = fs.statSync(Util.unReplacePath(url))
              headers['content-range'] = `${start}-${end}/${stats.size}`
            }
          } catch (e) {
            console.error('Could not get size of file', url, e)
          }
        } else if (res.status === 200) {
          throw new Error(
            `HTTP ${res.status} when fetching ${url} bytes ${start}-${end}`,
          )
        }

        // return the response headers, and the data buffer
        return res.arrayBuffer().then(arrayBuffer => ({
          headers,
          requestDate,
          responseDate,
          buffer: Buffer.from(arrayBuffer),
        }))
      },
      res => {
        throw new Error(
          `HTTP ${res.status} when fetching ${url} bytes ${start}-${end}`,
        )
      },
    )
  }
  const globalCache = new HttpRangeFetcher({
    fetch: fetchBinaryRange,
    size: 50 * 1024 * 1024, // 50MB
    chunkSize: Math.pow(2, 18), // 256KB
    aggregationTime: 50,
  })

  var XHRBlob = declare(
    FileBlob,
    /**
     * @lends JBrowse.Model.XHRBlob.prototype
     */
    {
      /**
       * Blob of binary data fetched with an XMLHTTPRequest.
       *
       * Adapted by Robert Buels from the URLFetchable object in the
       * Dalliance Genome Explorer, which was is copyright Thomas Down
       * 2006-2011.
       * @constructs
       */
      constructor(url, start, end, opts) {
        if (!opts) {
          if (typeof start === 'object') {
            opts = start
            start = undefined
          } else {
            opts = {}
          }
        }

        this.url = url
        this.start = start || 0
        if (end) {
          this.end = end
        }
        this.opts = opts
      },

      slice(s, l) {
        var ns = this.start,
          ne = this.end
        if (ns && s) {
          ns = ns + s
        } else {
          ns = s || ns
        }
        if (l && ns) {
          ne = ns + l - 1
        } else {
          ne = ne || l - 1
        }
        return new XHRBlob(this.url, ns, ne, this.opts)
      },

      fetch(callback, failCallback) {
        const length =
          this.end === undefined ? undefined : this.end - this.start + 1
        if (length < 0) {
          throw new Error('Length less than 0 received')
        } else if (length == undefined && this.start == 0) {
          getfetch(this.url)
            .then(res => res.arrayBuffer())
            .then(callback)
            .catch(failCallback)
        } else {
          globalCache
            .getRange(this.url, this.start, length)
            .then(
              this._getResponseArrayBuffer.bind(this, callback),
              failCallback,
            )
        }
      },

      async fetchBufferPromise() {
        const length =
          this.end === undefined ? undefined : this.end - this.start + 1
        try {
          if (length < 0) {
            throw new Error('Length less than 0 received')
          } else if (length == undefined && this.start == 0) {
            const range = await getfetch(this.url)
            if (!range.ok) {
              throw new Error(`HTTP ${range.status} when fetching ${this.url}`)
            }
            return new Buffer(await range.arrayBuffer())
          } else {
            var range = await globalCache.getRange(this.url, this.start, length)
            return range.buffer
          }
        } catch (e) {
          if (!e.message) {
            const bytes = length ? ` bytes ${this.start}-${this.end}` : ''
            throw new Error(`HTTP ${e.status} when fetching ${e.url} ${bytes}`)
          }
          throw e
        }
      },

      _getResponseArrayBuffer(callback, { buffer }) {
        if (buffer.buffer) {
          const arrayBuffer = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength,
          )
          callback(arrayBuffer)
        } else {
          throw new Error('could not convert response to ArrayBuffer')
        }
      },

      read(offset = 0, length, callback, failCallback) {
        globalCache
          .getRange(this.url, this.start + offset, length)
          .then(this._getResponseArrayBuffer.bind(this, callback), failCallback)
      },

      async readBufferPromise(offset = 0, length) {
        const range = await globalCache.getRange(
          this.url,
          this.start + offset,
          length,
        )
        return range.buffer
      },

      stat(callback, failCallback) {
        this.statPromise().then(callback, failCallback)
      },

      statPromise() {
        return globalCache.stat(this.url)
      },
    },
  )
  return XHRBlob
})
