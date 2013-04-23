define( [ 'dojo/_base/declare',
          'JBrowse/Model/FileBlob',
          'JBrowse/Store/RemoteBinaryFile'
        ],
        function( declare, FileBlob, RemoteBinaryFileCache ) {
var globalCache = new RemoteBinaryFileCache({
    name: 'XHRBlob',
    maxSize: 100000000 // 100MB of file cache
});

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
    constructor: function(url, start, end, opts) {
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

    slice: function(s, l) {
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

    fetch: function( callback, failCallback ) {
        globalCache.get({
            url: this.url,
            start: this.start,
            end: this.end,
            success: callback,
            failure: failCallback
        });
    },

    read: function( offset, length, callback, failCallback ) {
        var start = this.start + offset,
            end = start + length;

        globalCache.get({
            url: this.url,
            start: start,
            end: end,
            success: callback,
            failure: failCallback
        });
    }
});
return XHRBlob;
});