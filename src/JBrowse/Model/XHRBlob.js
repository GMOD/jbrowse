cjsRequire('whatwg-fetch')
const tenaciousFetch = cjsRequire('tenacious-fetch').default

const { HttpRangeFetcher } = cjsRequire('http-range-fetcher')
const { Buffer } = cjsRequire('buffer')

define( [ 'dojo/_base/declare',
          'JBrowse/Util',
          'JBrowse/Model/FileBlob',
        ],
        function( declare, Util, FileBlob  ) {

function fetchBinaryRange(url, start, end) {
    const requestDate = new Date()
    return tenaciousFetch(url, {
      method: 'GET',
      headers: { range: `bytes=${start}-${end}` },
      credentials: 'same-origin',
      retries: 5,
      retryDelay: 1000, // 1 sec, 2 sec, 3 sec
      retryStatus: [500, 404, 503],
      onRetry: ({retriesLeft, retryDelay}) => {
        console.warn(`${url} bytes ${start}-${end} request failed, retrying (${retriesLeft} retries left)`)
      }
    }).then(res => {
      const responseDate = new Date()
      if (res.status !== 206 && res.status !== 200)
        throw new Error(
          `HTTP ${res.status} when fetching ${url} bytes ${start}-${end}`,
        )

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
            const fs = electronRequire("fs"); //Load the filesystem module
            const stats = fs.statSync(Util.unReplacePath(url))
            headers['content-range'] = `${start}-${end}/${stats.size}`
          } catch(e) {
            console.error('Could not get size of file', url, e)
         }
      } else if(res.status === 200) {
        throw new Error(
          `HTTP ${res.status} when fetching ${url} bytes ${start}-${end}`,
        )
      }

      // return the response headers, and the data buffer
      return res.arrayBuffer()
        .then(arrayBuffer => ({
            headers,
            requestDate,
            responseDate,
            buffer: Buffer.from(arrayBuffer),
        }))
    }, res => {
        throw new Error(`HTTP ${res.status} when fetching ${url} bytes ${start}-${end}`)
    })
  }
  const globalCache = new HttpRangeFetcher({
      fetch: fetchBinaryRange,
      size: 50 * 1024, // 50MB
      chunkSize: Math.pow(2,18), // 256KB
      aggregationTime: 50,
  })


var XHRBlob = declare( FileBlob,
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
                opts = start;
                start = undefined;
            } else {
                opts = {};
            }
        }

        this.url = url;
        this.start = start || 0;
        if (end) {
            this.end = end;
        }
        this.opts = opts;
    },

    slice(s, l) {
        var ns = this.start, ne = this.end;
        if (ns && s) {
            ns = ns + s;
        } else {
            ns = s || ns;
        }
        if (l && ns) {
            ne = ns + l - 1;
        } else {
            ne = ne || l - 1;
        }
        return new XHRBlob(this.url, ns, ne, this.opts);
    },

    fetch( callback, failCallback ) {
        const length = this.end === undefined ? undefined : this.end - this.start + 1
        if (length < 0) debugger
        globalCache.getRange(this.url, this.start, length)
            .then(
                this._getResponseArrayBuffer.bind(this,callback),
                failCallback,
            )
    },

    async fetchBufferPromise() {
        const length = this.end === undefined ? undefined : this.end - this.start + 1
        if (length < 0) debugger
        const range = await globalCache.getRange(this.url, this.start, length)
        return range.buffer
    },

    _getResponseArrayBuffer(callback,{buffer}) {
        if (buffer.buffer) {
            const arrayBuffer = buffer.buffer.slice(
                buffer.byteOffset, buffer.byteOffset + buffer.byteLength
            )
            callback(arrayBuffer)
        } else throw new Error('could not convert response to ArrayBuffer')

    },

    read( offset, length, callback, failCallback ) {
        globalCache.getRange(this.url, this.start + offset, length)
            .then(
                this._getResponseArrayBuffer.bind(this,callback),
                failCallback,
            )
    },

    async readBufferPromise(offset, length) {
        const range = await globalCache.getRange(this.url, this.start + offset, length)
        return range.buffer
    },

    stat(callback, failCallback) {
        this.statPromise().then(callback, failCallback)
    },

    statPromise() {
        return globalCache.stat(this.url)
    }
});
return XHRBlob;
});
