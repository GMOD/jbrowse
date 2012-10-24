define( ['JBrowse/Store',
         'JBrowse/Util',
         'JBrowse/Digest/Crc32'
        ],
        function( Store, Util, Crc32 ) {

/**
 * Storage backend for sequences broken up into chunks, stored and
 * served as static text files.
 * @class
 * @constructor
 * @extends Store
 * @lends JBrowse.Store.Sequence.StaticChunked
 */
var StaticChunked = function(args) {
    Store.call( this, args );

    this.chunkCache  = {};

    this.compress    = args.compress;
    this.urlTemplate = args.urlTemplate;
    this.baseUrl     = args.baseUrl;
};

StaticChunked.prototype = new Store('');

/**
 * @param {Object} seq object describing the sequence to operate on
 * @param {Number} start start coord, in interbase
 * @param {Number} end end coord, in interbase
 * @param {Function} callback function that takes ( start, end, seq )
 */
StaticChunked.prototype.getRange = function( seq, start, end, callback) {

    var seqname    = seq.name;
    var chunkSize  = seq.seqChunkSize;
    var firstChunk = Math.floor( Math.max(0,start) / chunkSize );
    var lastChunk  = Math.floor( (end - 1)         / chunkSize );
    var chunk;

    // if a callback spans more than one chunk, we need to wrap the
    // callback in another one that will be passed to each chunk to
    // concatenate the different pieces from each chunk and *then*
    // call the main callback
    if( firstChunk != lastChunk ) {
        callback = (function() {
            var chunk_seqs = [],
                chunks_still_needed = lastChunk-firstChunk+1,
                orig_callback = callback;
            return function( start, end, seq, chunkNum) {
                chunk_seqs[chunkNum] = seq;
                if( --chunks_still_needed == 0 )
                    orig_callback( start, end, chunk_seqs.join("") );
            };
         })();
    }

    var callbackInfo = { start: start, end: end, callback: callback };

    if( !this.chunkCache[seqname] ) {
        this.chunkCache[seqname] = [];
    }
    var chunkCacheForSeq = this.chunkCache[seqname];
    var sequrl = Util.resolveUrl(
        this.baseUrl,
        Util.fillTemplate(
            this.urlTemplate,
            {
                'refseq': seq.name,
                'refseq_dirpath': function() {
                    var n = seq.name;
                    var hex = Crc32.crc32("noggin").toString(16).replace('-','n').split('');
                    var dirpath = [];
                    for( var i = 0; i<hex.length; i += 3 ) {
                        var end = Math.min( hex.length, i+3 );
                        dirpath.push( hex.slice( i, end ).join('') );
                    }
                    return dirpath.join('/');
                }
            }
        ));

    for (var i = firstChunk; i <= lastChunk; i++) {
        //console.log("working on chunk %d for %d .. %d", i, start, end);

        chunk = chunkCacheForSeq[i];
        if (chunk) {
            if (chunk.loaded) {
                callback( start,
                          end,
                          chunk.sequence.substring(
                              start - i*chunkSize,
                              end - i*chunkSize
                          ),
                          i
                        );
            } else {
                //console.log("added callback for %d .. %d", start, end);
                chunk.callbacks.push(callbackInfo);
            }
        } else {
            chunk = {
                loaded: false,
                num: i,
                callbacks: [callbackInfo]
            };
            chunkCacheForSeq[i] = chunk;

            dojo.xhrGet({
                            url: sequrl + i + ".txt" + ( this.compress ? 'z' : '' ),
                            load: function (response) {
                                var ci;
                                chunk.sequence = response;
                                for (var c = 0; c < chunk.callbacks.length; c++) {
                                    ci = chunk.callbacks[c];
                                    ci.callback( ci.start,
                                                 ci.end,
                                                 response.substring( ci.start - chunk.num*chunkSize,
                                                                     ci.end   - chunk.num*chunkSize
                                                                   ),
                                                 i
                                               );
                                }
                                chunk.callbacks = undefined;
                                chunk.loaded = true;
                            }
                        });
        }
    }
};


return StaticChunked;
});