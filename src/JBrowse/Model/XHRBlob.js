define( [ 'dojo/_base/declare',
          'JBrowse/Model/FileBlob'
        ],
        function( declare, FileBlob ) {
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

    fetch: function(callback, attempt, truncatedLength) {
        var thisB = this;

        attempt = attempt || 1;
        if( attempt > 3 ) {
            callback(null);
            return;
        }

        var req = new XMLHttpRequest();
        var length;
        req.open('GET', this.url, true);
        req.overrideMimeType('text/plain; charset=x-user-defined');
        if (this.end) {
            req.setRequestHeader('Range', 'bytes=' + this.start + '-' + this.end);
            length = this.end - this.start + 1;
        }
        req.responseType = 'arraybuffer';
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                if (req.status == 200 || req.status == 206) {
                    thisB.totalSize = (function() {
                        var contentRange = req.getResponseHeader('Content-Range');
                        if( ! contentRange )
                            return undefined;
                        var match = contentRange.match(/\/(\d+)$/);
                        return match ? parseInt(match[1]) : undefined;
                    })();
                    thisB.size = length || thisB.totalSize;

                    if (req.response) {
                        return callback(req.response);
                    } else if (req.mozResponseArrayBuffer) {
                        return callback(req.mozResponseArrayBuffer);
                    } else {
                        var r = req.responseText;
                        if (length && length != r.length && (!truncatedLength || r.length != truncatedLength)) {
                            return thisB.fetch( callback, attempt + 1, r.length );
                        } else {
                            return callback( thisB._stringToBuffer(req.responseText) );
                        }
                    }
                } else {
                    return thisB.fetch(callback, attempt + 1);
                }
            }
            return null;
        };
        if (this.opts.credentials) {
            req.withCredentials = true;
        }
        req.send('');
    }
});
return XHRBlob;
});