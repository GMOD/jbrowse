const crossFetch = cjsRequire('cross-fetch')
const { HttpRangeFetcher } = cjsRequire('http-range-fetcher')
const { Buffer } = cjsRequire('buffer')

define( [ 'dojo/_base/declare',
          'JBrowse/Util',
          'JBrowse/Model/FileBlob',
        ],
        function( declare, Util, FileBlob  ) {


function crossFetchBinaryRange(url, start, end) {
    const requestDate = new Date()
    return crossFetch(url, {
      method: 'GET',
      headers: { range: `bytes=${start}-${end}` },
    }).then(res => {
      const responseDate = new Date()
      if (res.status !== 206 && res.status !== 200)
        throw new Error(
          `HTTP ${res.status} when fetching ${url} bytes ${start}-${end}`,
        )

      if (! Util.isElectron() && res.status === 200) {
        // electron charmingly returns HTTP 200 for byte range requests.
        throw new Error(
          `HTTP ${res.status} when fetching ${url} bytes ${start}-${end}`,
        )
      }

      const bufPromise = res.buffer
        ? res.buffer()
        : res.arrayBuffer().then(arrayBuffer => Buffer.from(arrayBuffer))
      // return the response headers, and the data buffer
      return bufPromise.then(buffer => ({
        headers: res.headers.map,
        requestDate,
        responseDate,
        buffer,
      }))
    })
  }
  const globalCache = new HttpRangeFetcher({
      fetch: crossFetchBinaryRange,
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
