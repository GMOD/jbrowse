define( [ 'dojo/_base/declare',
          'JBrowse/Store/SeqFeature',
          'JBrowse/Util',
          'JBrowse/Digest/Crc32'
        ],
        function( declare, SeqFeatureStore, Util, Crc32 ) {

var Feature = Util.fastDeclare({
    constructor: function(args) {
        this.start = args.start;
        this.end = args.end;
        this.seq = args.seq;
        this.seq_id = args.seq_id;
    },
    get: function( field ) {
        return this[field];
    },
    tags: function() {
        return ['seq_id','start','end','seq'];
    }
});

return declare( SeqFeatureStore,

/**
 * @lends JBrowse.Store.Sequence.StaticChunked
 * @extends JBrowse.Store.SeqFeature
 */
{

/**
 * Storage backend for sequences broken up into chunks, stored and
 * served as static text files.
 * @constructs
 */
    constructor: function(args) {
        this.chunkCache   = {};
        this.compress     = args.compress;
        this.urlTemplate  = args.urlTemplate;
        if( ! this.urlTemplate ) {
            throw "no urlTemplate provided, cannot open sequence store";
        }

        this.baseUrl      = args.baseUrl;
        this.seqChunkSize = args.seqChunkSize;
    },

    getFeatures: function( query, callback, endCallback ) {

        var start = query.start;
        var end   = query.end;
        var seqname    = query.ref;
        var chunkSize  = query.seqChunkSize || this.refSeq.name == query.ref && this.refSeq.seqChunkSize || this.seqChunkSize;
        var firstChunk = Math.floor( Math.max(0,start) / chunkSize );
        var lastChunk  = Math.floor( (end - 1)         / chunkSize );

        // if a callback spans more than one chunk, we need to wrap the
        // callback in another one that will be passed to each chunk to
        // concatenate the different pieces from each chunk and *then*
        // call the main callback
            callback = (function() {
                            var chunk_seqs = [],
                            chunks_still_needed = lastChunk-firstChunk+1,
                            orig_callback = callback;
                            return function( start, end, seq, chunkNum) {
                                chunk_seqs[chunkNum] = seq;
                                if( --chunks_still_needed == 0 ) {
                                    orig_callback( new Feature({seq_id: query.ref, start: start, end: end, seq: chunk_seqs.join("")}) );
                                    if( endCallback )
                                        endCallback();
                                }
                            };
                        })();

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
                            'refseq': query.ref,
                            'refseq_dirpath': function() {
                                var hex = Crc32.crc32( query.ref )
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