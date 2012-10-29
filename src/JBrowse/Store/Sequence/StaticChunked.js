define( [ 'dojo/_base/declare',
          'JBrowse/Store',
          'JBrowse/Util',
          'JBrowse/Digest/Crc32'
        ],
        function( declare, Store, Util, Crc32 ) {

return declare( null,

/**
 * @lends JBrowse.Store.Sequence.StaticChunked
 * @extends JBrowse.Store
 */
{

/**
 * Storage backend for sequences broken up into chunks, stored and
 * served as static text files.
 * @constructs
 */
    constructor: function(args) {
        this.chunkCache  = {};

        this.compress    = args.compress;
        this.urlTemplate = args.urlTemplate;
        this.baseUrl     = args.baseUrl;
    },

    /**
     * @param {Object} seq object describing the sequence to operate on
     * @param {Number} start start coord, in interbase
     * @param {Number} end end coord, in interbase
     * @param {Function} callback function that takes ( start, end, seq )
     */
    getRange: function( seq, start, end, callback) {

        var seqname    = seq.name;
        var chunkSize  = seq.seqChunkSize;
        var firstChunk = Math.floor( Math.max(0,start) / chunkSize );
        var lastChunk  = Math.floor( (end - 1)         / chunkSize );

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

        for (var i = firstChunk; i <= lastChunk; i++) {
            //console.log("working on chunk %d for %d .. %d", i, start, end);

            var chunk = chunkCacheForSeq[i];
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
                chunkCacheForSeq[i] = {
                    loaded: false,
                    num: i,
                    callbacks: [callbackInfo]
                };

                var sequrl = Util.resolveUrl(
                    this.baseUrl,
                    Util.fillTemplate(
                        this.urlTemplate,
                        {
                            'refseq': seq.name,
                            'refseq_dirpath': function() {
                                var hex = Crc32.crc32( seq.name )
                                               .toString(16)
                                               .toLowerCase()
                                               .replace('-','n');
                                // zero-pad the hex string to be 8 chars if necessary
                                while( hex.length < 8 )
                                    hex = '0'+hex;
                                var dirpath = [];
                                for( var i = 0; i < hex.length; i += 3 ) {
                                    dirpath.push( hex.substring( i, i+3 ) );
                                }
                                return dirpath.join('/');
                            }
                        })
                );

                dojo.xhrGet({
                                url: sequrl + i + ".txt" + ( this.compress ? 'z' : '' ),
                                load: dojo.hitch( this, function( chunkRecord, response ) {
                                    //console.log('response for chunk '+chunkRecord.num);
                                    chunkRecord.sequence = response;
                                    chunkRecord.loaded = true;
                                    dojo.forEach( chunkRecord.callbacks, function(ci) {
                                        ci.callback( ci.start,
                                                     ci.end,
                                                     response.substring( ci.start - chunkRecord.num*chunkSize,
                                                                         ci.end   - chunkRecord.num*chunkSize
                                                                       ),
                                                     i
                                                   );
                                    });
                                    delete chunkRecord.callbacks;

                                }, chunkCacheForSeq[i] )
                            });
            }
        }
    }
});
});