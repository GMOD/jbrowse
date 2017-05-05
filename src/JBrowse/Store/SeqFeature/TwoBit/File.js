define ([
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Util',
            'dojo/Deferred',
            'dojo/when',
            'dojo/promise/all'
        ],
        function(
            declare,
            array,
            lang,
            XHRBlob,
            Util,
            Deferred,
            when,
            all
        ) {

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

var TWOBIT_MAGIC = [26, 65, 39, 67];

return declare(null, {

    constructor: function(args) {
        this.numSeqs = 0;

        this.byteSwapped = false;
        this.data = args.data;
        this.store = args.store;
        this.maxChunkSize = args.maxChunkSize || 5000000;

        this.chunkCache   = {};
        this.headers = {};

        this.seqChunkSize = args.seqChunkSize || 5000;
        this.seqHeader = [];
    },

    init: function( args ) {
        var successCallback = args.success || function() {};
        var failCallback = args.failure || function(e) {console.error(e); };

        this._read2bitHeader( dojo.hitch(this, function() { 
            this._read2bitIndex( successCallback, failCallback);
        }), failCallback);
    },

    _read2bitHeader: function( successCallback, failCallback ) {
        this.data.read(0, 15, dojo.hitch(this, function(results) {
            var signature = this._toByteArray(results, 0, 4);
            if(!this._arrayEquals(signature, TWOBIT_MAGIC)) {
                if(this._arrayEquals(this.byteSwap(signature), TWOBIT_MAGIC)) {
                    this.byteSwapped = true;
                } else {
                    failCallback("Not a 2bit file");
                }
                this.numSeqs = this._toInteger(results, 8, 12);
                successCallback();
            }
        }), failCallback);
    },

    _read2bitIndex: function( successCallback, failCallback ) {
        this.chrToIndex = {};
        this.offset = [];
        var maxLength = 256; // Since namesize is one byte, there are at most 256 bytes used for each name.
        if(this.numSeqs == 0) {
            successCallback();
            return;
        }
        this.data.read(16, this.numSeqs*(maxLength + 5), dojo.hitch(this, function(results) {
            var i = 0;
            for(var seqIndex = 0; seqIndex < this.numSeqs; seqIndex++) {
                var nameSize = this._toInteger(results, i, i+1); i++;
                var seqName = this._toString(results, i, i+nameSize);
                this.chunkCache[seqName] = [];
                this.chrToIndex[seqName] = seqIndex; i += nameSize;
                this.offset[seqIndex] = this._toInteger(results, i, i + 4); i += 4;
            }
            successCallback();
        }), failCallback);
    },



    _arrayEquals: function (array1, array2) {
        if(array1.length != array2.length)
            return false;
        for(var i in array1) {
            if(array1[i] != array2[i])
                return false;
        }

        return true;
    },

    _toString: function (arrayBuffer, start, end) {
        var byteArray = this._toByteArray(arrayBuffer, start, end);
        var retString = "";
        if(typeof byteArray == 'number')
            return String.fromCharCode(byteArray);
        for(var i in byteArray) {
            retString = retString + String.fromCharCode(byteArray[i]);
        }
        return retString;
    },

    _toInteger: function (arrayBuffer, start, end) {
        var byteArray = this._toByteArray(arrayBuffer, start, end);
        if(this.byteSwapped)
            byteArray = this.byteSwap(byteArray);
        var retInt = 0;
        for(var i = 0; i < byteArray.length; i++) {
            retInt = retInt + (byteArray[i] << 8*(byteArray.length - 1 - i));
        }
        return retInt;
    },

    byteSwap: function ( byteArray ) {
        if(byteArray.length && byteArray.length > 1) {
            return byteArray.reverse();
        } else {
            return byteArray;
        }
    },

    _toByteArray: function (arrayBuffer, start, end) {

        var slicedArray = start !== undefined && end !== undefined ? arrayBuffer.slice(start, end) : start !== undefined ? arrayBuffer.slice(start) : arrayBuffer;
        var typedArray = new Uint8Array(slicedArray);
        var retArray = [];
        for(var i = 0; i < typedArray.length; i++) {
            retArray.push(typedArray[i]);
        }
        return retArray;
    }, 

    fetch: function( query, callback, endCallback, errorCallback) {
        errorCallback = errorCallback || function(e) { console.error(e); };

        var seqName = query.ref;

        if( !(seqName in this.chrToIndex) && endCallback ) {
            endCallback();
            return;
        }

        var callbackInfo = { query: query, seqFunc: dojo.hitch(this, "_fetchSequence"), callback: callback, endCallback: endCallback, errorCallback: errorCallback };
        var seqHeader = this.headers[seqName];

        // Only gets the sequence header once, to save load time.  Caches it thereafter.
        if( seqHeader ) {
            if( seqHeader.loaded ) {
                this._fetchSequence( query, seqHeader, callback, endCallback, errorCallback );
            } else if( seqHeader.error ) {
                errorCallback( seqHeader.error );
            } else {
                seqHeader.callbacks.push( callbackInfo )
            }
        } else {
            this.headers[seqName] = {
                loaded: false,
                callbacks: [callbackInfo]
            };
            this._readSequenceHeader( seqName, dojo.hitch( this, function( newHeader, header ){
                lang.mixin( newHeader, header );
                newHeader.loaded = true;
                array.forEach( newHeader.callbacks, function( ci ) {
                    ci.seqFunc( ci.query, header, ci.callback, ci.endCallback, ci.errorCallback );
                });
                delete newHeader.callbacks;
            }, this.headers[seqName] ),
            dojo.hitch( this, function( newHeader, error ) {
                newHeader.error = error;
                array.forEach( newHeader.callbacks, function( ci ) {
                    ci.errorCallback( error );
                });
                delete newHeader.callbacks;
            }, this.headers[seqName] ) );
        }
    },

    _readSequenceHeader: function(seqName, callback, errorCallback) {
        var index = this.chrToIndex[seqName];
        

        if(this.seqHeader[index])
            callback(this.seqHeader[index]);
        else {
            var headerStart = this.offset[index];

            this.data.read(headerStart, 7, dojo.hitch(this, function(results) {
                var currData = headerStart;
                var dnaSize = this._toInteger(results, 0, 4);
                var nBlockCount = this._toInteger(results, 4, 8);
                var nBlocks = [];

                currData += 8;

                var haveNBlocks = new Deferred();
                
                if(nBlockCount) {
                    this.data.read(currData, 8*nBlockCount - 1, dojo.hitch(this, function(nBlockData) {
                        haveNBlocks.resolve(nBlockData, true);
                    }), errorCallback);
                } else {
                    haveNBlocks = [];
                }

                currData += (8*nBlockCount);

                var haveMasks = new Deferred();
                this.data.read(currData, 4, dojo.hitch(this, function(rawMCount) {
                    var maskBlockCount = this._toInteger(rawMCount, 0, 4);
                    var maskBlocks = [];
                    currData += 4;
                    if(maskBlockCount) {
                        this.data.read(currData, 8*maskBlockCount - 1, dojo.hitch(this, function(maskBlockData){
                            currData += 8*maskBlockCount;
                            haveMasks.resolve(maskBlockData, true);
                        }), errorCallback);    
                    } else {
                        haveMasks.resolve([], true);
                    }
                }), errorCallback);

                when(all([haveNBlocks, haveMasks]), dojo.hitch(this, function(results) {
                    currData += 4;
                    var header = {
                        dnaSize: dnaSize,
                        nBlockData: results[0],
                        maskData: results[1],
                        dnaStart: currData,
                        dnaEnd: this.offset[index + 1]
                    };
                    this.seqHeader[index] = header;
                    callback(header);
                }));
            }), errorCallback);
        }
    },

    _toBases: function( val ) {
        var bitsToBase = ["T", "C", "A", "G"];
        var firstFour = (val >> 4) & 0xf;
        var lastFour = val & 0xf;

        var first = (firstFour >> 2) & 0x3;
        var second = firstFour & 0x3;
        var third = (lastFour >> 2) & 0x3;
        var fourth = lastFour & 0x3;

        var bitArray = [first, second, third, fourth];

        return bitArray.map( function(value){
            return bitsToBase[value];
        });
    },

    _toBaseString: function( byteArray ) {
        var retString = "";
        for(var index in byteArray) {
            retString = retString + this._toBases(byteArray[index]).join("");
        }
        return retString;
    },

    _applyNBlocks: function( baseString, start, end, nBlocks ) {
        var retString = baseString;
        for( var i in nBlocks ) {
            var blockStart = Math.max( 0, nBlocks[i].start - start );
            var blockLength = nBlocks[i].size + Math.min( 0, nBlocks[i].start - start );
            blockLength = Math.max( 0, Math.min( blockLength, end - Math.max( nBlocks[i].start, start ) ) );
            retString = [ retString.slice( 0, blockStart ), this._nBlock( blockLength ), retString.slice( blockStart + blockLength ) ].join( "" );
        }
        return retString;
    },

    _applyMasks: function( baseString, start, end, masks ) {
        var retString = baseString;
        for( var i in masks ) {
            var maskStart = Math.max( 0, masks[i].start - start );
            var maskLength = masks[i].size + Math.min( 0, masks[i].start - start );
            maskLength = Math.max( 0, Math.min( maskLength, end - masks[i].start ) );
            retString = [ retString.slice( 0, maskStart ),
                retString.slice(maskStart, maskStart + maskLength).toLowerCase(),
                retString.slice(maskStart + maskLength ) ].join("");
        }
        return retString;
    },

    _nBlock: function( length ) {
        return Array(length + 1).join("N");
    },

    _getApplicable: function( blockBuffer, start, end ) {

        var retArray = [];
        
        var firstApplicable = this._findApplicable( blockBuffer, start, end );

        if( firstApplicable ) {
            retArray.push( firstApplicable );
            var index = firstApplicable.index + 1;
            while( index < blockBuffer.byteLength / 8 ) {
                var i = index * 4;
                var j = i + blockBuffer.byteLength / 2;

                var nextStart = this._toInteger(blockBuffer, i, i + 4);
                var nextSize = this._toInteger(blockBuffer, j, j + 4);

                if( nextStart <= end ) {
                    retArray.push({ start: nextStart, size: nextSize });
                    index++;
                } else {
                    break;
                }
            }

            index = firstApplicable.index - 1;
            while( index >= 0) {
                var i = index * 4;
                var j = i + blockBuffer.byteLength / 2;
                var nextStart = this._toInteger( blockBuffer, i, i + 4 );
                var nextSize = this._toInteger( blockBuffer, j, j + 4 );

                if(nextStart + nextSize > start) {
                    retArray.unshift({ start: nextStart, size: nextSize });
                    index--;
                } else {
                    break;
                }
            }
        }

        return retArray;
    },

    _findApplicable: function( blockBuffer, queryStart, queryEnd, blockStart, blockEnd) {
        if( blockEnd === undefined )
            blockEnd = (blockBuffer.byteLength || 0)/ 8 - 1; // Buffer's size will always be divisible by 8 for masks or nBlocks
        if( blockStart === undefined )
            blockStart = 0;

        if(blockStart > blockEnd)
            return undefined;

        var sample = Math.floor((blockStart + blockEnd)/2);
        var i = sample * 4;
        var j = i + blockBuffer.byteLength / 2;

        var sampleStart = this._toInteger( blockBuffer, i, i + 4 );
        var sampleSize = this._toInteger( blockBuffer, j, j + 4 );

        if( sampleStart + sampleSize > queryStart && sampleStart <= queryEnd ) {
            return { start: sampleStart, size: sampleSize, index: sample };
        } else if ( sampleStart > queryEnd ) {
            return this._findApplicable( blockBuffer, queryStart, queryEnd, blockStart, sample - 1);
        }
        return this._findApplicable( blockBuffer, queryStart, queryEnd, sample + 1, blockEnd );
    },

    _fetchSequence: function ( query, header, callback, endCallback, errorCallback ) {
        var start = typeof query.start == 'number' ? query.start : parseInt( query.start );

        var end = typeof query.end == 'number' ? query.end : parseInt( query.end );

        start = Math.max(0, start);

        var chunkSize = query.seqChunkSize || ( this.refSeq && this.refSeq.name == query.ref && this.refSeq.seqChunkSize ) || this.seqChunkSize;
        var firstChunk = Math.floor( Math.max( 0, start ) / chunkSize );
        var lastChunk = Math.floor( ( end - 1 ) / chunkSize );

        var seqname = this.store.browser.regularizeReferenceName( query.ref );
        
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

        var callbackInfo = { start: start, end: end, success: callback, error: errorCallback  };

        if( !this.chunkCache[seqname] ) {
            this.chunkCache[seqname] = [];
        }

        var chunkCacheForSeq = this.chunkCache[seqname];

        for (var j = firstChunk; j <= lastChunk; j++) {
            //console.log("working on chunk %d for %d .. %d", i, start, end);

            var chunk = chunkCacheForSeq[j];
            if (chunk) {
                if (chunk.loaded) {
                    callback( start,
                              end,
                              chunk.sequence.substring(
                                  start - j*chunkSize,
                                  end - j*chunkSize
                              ),
                              j
                            );
                }
                else if( chunk.error ) {
                    errorCallback( chunk.error );
                }
                else {
                    //console.log("added callback for %d .. %d", start, end);
                    chunk.callbacks.push(callbackInfo);
                }
            } else {
                chunkCacheForSeq[j] = {
                    loaded: false,
                    num: j,
                    callbacks: [callbackInfo]
                };

                var blockStart = j * chunkSize;
                var blockEnd = Math.min( header.dnaSize, ( j + 1 ) * chunkSize);

                var i = 0;

                var nBlocksToApply = this._getApplicable( header.nBlockData, blockStart, blockEnd );
                var masksToApply = this._getApplicable( header.maskData, blockStart, blockEnd );

                // dataStart and dataEnd are still in bp, so we must convert them to bytes.
                var byteStart = header.dnaStart + Math.floor( blockStart / 4 );
                var sliceStart = blockStart % 4;

                var byteEnd = header.dnaStart + Math.ceil( blockEnd / 4 );
                var sliceEnd = sliceStart + (blockEnd - blockStart);

                var byteLength = byteEnd - byteStart - 1;

                if( byteLength >= 0) {
                    this.data.read(byteStart, byteLength, dojo.hitch( this, function(chunkRecord, results ) {
                        var byteArray = this._toByteArray( results );
                        var baseString = this._toBaseString( byteArray );
                        baseString = baseString.slice(sliceStart, sliceEnd);
                        baseString = this._applyNBlocks( baseString, blockStart, blockEnd, nBlocksToApply );
                        baseString = this._applyMasks( baseString, blockStart, blockEnd, masksToApply );
                        chunkRecord.sequence = baseString;
                        chunkRecord.loaded = true;
                        array.forEach( chunkRecord.callbacks, function(ci) {
                                        ci.success( ci.start,
                                                    ci.end,
                                                    baseString.substring( ci.start - chunkRecord.num*chunkSize,
                                                                        ci.end   - chunkRecord.num*chunkSize
                                                                      ),
                                                    chunkRecord.num
                                                   );
                                    });

                        delete chunkRecord.callbacks;

                    }, chunkCacheForSeq[j] ),
                    dojo.hitch( this, function( chunkRecord, error ) {
                        chunkRecord.error = error;
                        array.forEach( chunkRecord.callbacks, function(ci) {
                            ci.error(error);
                        });
                        delete chunkRecord.callbacks;
                    }), chunkCacheForSeq[j] );
                }
            }
        }
    }
});

});


