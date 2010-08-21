function SequenceTrack(trackMeta, url, refSeq, browserParams) {
    //trackMeta: object with:
    //  key:   display text track name
    //  label: internal track name (no spaces or odd characters)
    //  className: CSS class for sequence
    //  args: object with:
    //    seqDir: directory in which to find the sequence chunks
    //    chunkSize: size of sequence chunks, in characters
    //refSeq: object with:
    //  start: refseq start
    //  end:   refseq end
    //browserParams: object with:
    //  changeCallback: function to call once JSON is loaded
    //  trackPadding: distance in px between tracks
    //  baseUrl: base URL for the URL in trackMeta
    //  charWidth: width, in pixels, of sequence base characters
    //  seqHeight: height, in pixels, of sequence elements

    Track.call(this, trackMeta.label, trackMeta.key,
               false, browserParams.changeCallback);
    this.browserParams = browserParams;
    this.trackMeta = trackMeta;
    this.setLoaded();
    this.chunks = [];
    this.chunkSize = trackMeta.args.chunkSize;
    this.baseUrl = (browserParams.baseUrl ? browserParams.baseUrl : "") + url;
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
    }
    this.setLabel(this.key);
};

SequenceTrack.prototype.fillBlock = function(blockIndex, block,
                                             leftBlock, rightBlock,
                                             leftBase, rightBase,
                                             scale, stripeWidth,
                                             containerStart, containerEnd) {
    if (this.shown) {
        this.getRange(leftBase, rightBase,
                      function(start, end, seq) {
                          //console.log("adding seq from %d to %d: %s", start, end, seq);
                          var seqNode = document.createElement("div");
                          seqNode.className = "sequence";
                          seqNode.appendChild(document.createTextNode(seq));
	                  seqNode.style.cssText = "top: 0px;";
                          block.appendChild(seqNode);
                      });
        this.heightUpdate(this.browserParams.seqHeight, blockIndex);
    } else {
        this.heightUpdate(0, blockIndex);
    }
};

SequenceTrack.prototype.getRange = function(start, end, callback) {
    //start: start coord, in interbase
    //end: end coord, in interbase
    //callback: function that takes (start, end, seq)
    var firstChunk = Math.floor((start) / this.chunkSize);
    var lastChunk = Math.floor((end - 1) / this.chunkSize);
    var callbackInfo = {start: start, end: end, callback: callback};
    var chunkSize = this.chunkSize;
    var chunk;

    for (var i = firstChunk; i <= lastChunk; i++) {
        //console.log("working on chunk %d for %d .. %d", i, start, end);
        chunk = this.chunks[i];
        if (chunk) {
            if (chunk.loaded) {
                callback(start, end,
                         chunk.sequence.substring(start - (i * chunkSize),
                                                  end - (i * chunkSize)));
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
                            url: this.baseUrl + i + ".txt",
                            load: function (response) {
                                var ci;
                                chunk.sequence = response;
                                for (var c = 0; c < chunk.callbacks.length; c++) {
                                    ci = chunk.callbacks[c];
                                    ci.callback(ci.start,
                                                ci.end,
                                                response.substring(ci.start - (chunk.num * chunkSize),
                                                                   ci.end - (chunk.num * chunkSize)));
                                }
                                chunk.callbacks = undefined;
                                chunk.loaded = true;
                            }
                        });
        }
    }
};