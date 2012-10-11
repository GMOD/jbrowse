define( [ 'dojo/_base/declare',
          'JBrowse/Model/FileBlob',
          'JBrowse/Store/LRUCache'
        ],
        function( declare, FileBlob, LRUCache ) {
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

        this.cache = opts.cache
            || new LRUCache({
                                name: 'XHRBlob cache',
                                fillCallback: dojo.hitch(this, '_fetch')
                            });
        this.opts.cache = this.cache;
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

    fetch: function( callback ) {
        var url = this.url,
            end = this.end,
            start = this.start;

        var request = {
            url: url,
            end: end,
            start: start,
            toString: function() {
                return url+" (bytes "+start+".."+end+")";
            }
        };

        // note that the cache has `_fetch` configured as its fill callback
        this.cache.get( request, callback );
    },

    _fetch: function( request, callback, attempt, truncatedLength) {
        var thisB = this;

        attempt = attempt || 1;
        if( attempt > 3 ) {
            callback(null);
            return;
        }

        var req = new XMLHttpRequest();
        var length;
        req.open('GET', request.url, true);
        if( req.overrideMimeType )
            req.overrideMimeType('text/plain; charset=x-user-defined');
        if (request.end) {
            req.setRequestHeader('Range', 'bytes=' + request.start + '-' + request.end);
            length = request.end - request.start + 1;
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
                        return callback.call(thisB,req.response);
                    } else if (req.mozResponseArrayBuffer) {
                        return callback.call(thisB,req.mozResponseArrayBuffer);
                    } else {
                        try{
                            var r = req.responseText;
                            if (length && length != r.length && (!truncatedLength || r.length != truncatedLength)) {
                                return thisB._fetch( request, callback, attempt + 1, r.length );
                            } else {
                                return callback.call( thisB, thisB._stringToBuffer(req.responseText) );
                            }
                        } catch (x) {
                            console.error(''+x);
                            callback.call( thisB, null );
                        }
                    }
                } else {
                    return thisB._fetch( request, callback, attempt + 1);
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