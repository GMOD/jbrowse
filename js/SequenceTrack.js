function SequenceTrack(trackMeta, refSeq, browserParams) {
    //trackMeta: object with:
    //  key:   display text track name
    //  label: internal track name (no spaces or odd characters)
    //  config: object with:
    //    urlTemplate: url of directory in which to find the sequence chunks
    //    chunkSize: size of sequence chunks, in characters
    //refSeq: object with:
    //  start: refseq start
    //  end:   refseq end
    //browserParams: object with:
    //  changeCallback: function to call once JSON is loaded
    //  trackPadding: distance in px between tracks
    //  charWidth: width, in pixels, of sequence base characters
    //  seqHeight: height, in pixels, of sequence elements

    Track.call(this, trackMeta.label, trackMeta.key,
               false, browserParams.changeCallback);
    this.browserParams = browserParams;
    this.refSeq = refSeq;
    this.trackMeta = trackMeta;
    this.setLoaded();
    this.chunks = [];
    this.chunkSize = trackMeta.config.chunkSize;
    this.url = Util.resolveUrl(trackMeta.sourceUrl,
                               Util.fillTemplate(trackMeta.config.urlTemplate,
                                                 {'refseq': refSeq.name}) );

}

SequenceTrack.prototype = new Track("");

SequenceTrack.prototype.startZoom = function(destScale, destStart, destEnd) {
    this.hide();
    this.heightUpdate(0);
};

SequenceTrack.prototype.endZoom = function(destScale, destBlockBases) {
    if (destScale == this.browserParams.charWidth) this.show();
    Track.prototype.clear.apply(this);
};

SequenceTrack.prototype.setViewInfo = function(genomeView, numBlocks,
                                               trackDiv, labelDiv,
                                               widthPct, widthPx, scale) {
    Track.prototype.setViewInfo.apply(this, [genomeView, numBlocks,
                                             trackDiv, labelDiv,
                                             widthPct, widthPx, scale]);
    if (scale == this.browserParams.charWidth) {
        this.show();
    } else {
        this.hide();
        this.heightUpdate(0);
    }
    this.setLabel(this.key);
};

SequenceTrack.nbsp = String.fromCharCode(160);
SequenceTrack.prototype.fillBlock = function(blockIndex, block,
                                             leftBlock, rightBlock,
                                             leftBase, rightBase,
                                             scale, stripeWidth,
                                             containerStart, containerEnd) {
    var that = this;
    if (scale == this.browserParams.charWidth) {
        this.show();
    } else {
        this.hide();
        this.heightUpdate(0);
    }

    if (this.shown) {
        this.getRange( leftBase, rightBase,
                       function( start, end, seq ) {

                           // fill with leading blanks if the
                           // sequence does not extend all the way
                           // across our range
                           for( ; start < 0; start++ ) {
                               seq = SequenceTrack.nbsp + seq; //nbsp is an "&nbsp;" entity
                           }

                           // make a div to contain the sequences
                           var seqNode = document.createElement("div");
                           seqNode.className = "sequence";
                           block.appendChild(seqNode);

                           // add a div for the forward strand
                           seqNode.appendChild( that.renderSeqDiv( start, end, seq ));

                           // and one for the reverse strand
                           var comp = that.renderSeqDiv( start, end, that.complement(seq) );
                           comp.className = 'revcom';
                           seqNode.appendChild( comp );
                       }
                     );
        this.heightUpdate(this.browserParams.seqHeight, blockIndex);
    } else {
        this.heightUpdate(0, blockIndex);
    }
};

SequenceTrack.prototype.complement = (function() {
    var compl_rx   = /[ACGT]/gi;

    // from bioperl: tr/acgtrymkswhbvdnxACGTRYMKSWHBVDNX/tgcayrkmswdvbhnxTGCAYRKMSWDVBHNX/
    // generated with:
    // perl -MJSON -E '@l = split "","acgtrymkswhbvdnxACGTRYMKSWHBVDNX"; print to_json({ map { my $in = $_; tr/acgtrymkswhbvdnxACGTRYMKSWHBVDNX/tgcayrkmswdvbhnxTGCAYRKMSWDVBHNX/; $in => $_ } @l})'
    var compl_tbl  = {"S":"S","w":"w","T":"A","r":"y","a":"t","N":"N","K":"M","x":"x","d":"h","Y":"R","V":"B","y":"r","M":"K","h":"d","k":"m","C":"G","g":"c","t":"a","A":"T","n":"n","W":"W","X":"X","m":"k","v":"b","B":"V","s":"s","H":"D","c":"g","D":"H","b":"v","R":"Y","G":"C"};

    var compl_func = function(m) { return compl_tbl[m] || SequenceTrack.nbsp; };
    return function( seq ) {
        return seq.replace( compl_rx, compl_func );
    };
})();

//given the start and end coordinates, and the sequence bases, makes a
//div containing the sequence
SequenceTrack.prototype.renderSeqDiv = function ( start, end, seq ) {
    var container  = document.createElement("div");
    container.appendChild( document.createTextNode( seq ) );
    return container;
};

SequenceTrack.prototype.getRange = function(start, end, callback) {
    //start: start coord, in interbase
    //end: end coord, in interbase
    //callback: function that takes (start, end, seq)
    var firstChunk = Math.floor( Math.max(0,start) / this.chunkSize);
    var lastChunk = Math.floor((end - 1) / this.chunkSize);
    var chunkSize = this.chunkSize;
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

    for (var i = firstChunk; i <= lastChunk; i++) {
        //console.log("working on chunk %d for %d .. %d", i, start, end);
        chunk = this.chunks[i];
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
            this.chunks[i] = chunk;
            dojo.xhrGet({
                            url: this.url + i + ".txt",
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