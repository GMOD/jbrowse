define ([
        'dojo/_base/declare',
        'dojo/_base/array',
        'JBrowse/Model/XHRBlob',
        'JBrowse/Util',
        'dojo/Deferred',
        'dojo/when',
        'dojo/promise/all'
    ], function(declare, array, XHRBlob, Util, Deferred, when, all ) {
        

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

        var TWOBIT_MAGIC =[ 26, 65, 39, 67];

        return declare(null, {

        constructor: function(args) {
            this.numSeqs = 0;

            this.byteSwapped = false;
            this.data = args.data;
            this.store = args.store;
            this.maxChunkSize = args.maxChunkSize || 5000000;

            this.chunkCache   = {};
            this.seqChunkSize = args.seqChunkSize || 5000;
            this.seqHeader = [];
        },

        init: function( args ) {
            var successCallback = args.success || function() {};
            var failCallback = args.failure || function(e) {console.error(e); };

            this._read2bitHeader( dojo.hitch(this, function() { 
                this._read2bitIndex( function() {
                    successCallback();
                }, failCallback);
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

            this._readSequenceHeader(seqName, dojo.hitch(this, function(header){
                this._fetchSequence(query, header, callback, endCallback, errorCallback);
            }), errorCallback);
            
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
                            for(var i = 0; i < 4*nBlockCount; i+= 4) {
                                var j = i + 4*nBlockCount;
                                nBlocks.push({
                                    start: this._toInteger(nBlockData, i, i+4),
                                    size: this._toInteger(nBlockData, j, j + 4)
                                });
                            }
                            haveNBlocks.resolve(nBlocks, true);
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
                                for(var i = 0; i < 4*maskBlockCount; i += 4) {
                                    var j = i + 4*maskBlockCount;
                                    maskBlocks.push({
                                        start: this._toInteger(maskBlockData, i, i + 4),
                                        size: this._toInteger(maskBlockData, j, j + 4)
                                    });
                                }
                                currData += 8*maskBlockCount;
                                haveMasks.resolve(maskBlocks, true);
                            }), errorCallback);    
                        } else {
                            haveMasks.resolve([], true);
                        }
                    }), errorCallback);

                    when(all([haveNBlocks, haveMasks]), dojo.hitch(this, function(results) {
                        currData += 4;
                        var header = {
                            dnaSize: dnaSize,
                            nBlocks: results[0],
                            masks: results[1],
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

        _fetchSequence: function ( query, header, callback, endCallback, errorCallback ) {
            var start = typeof query.start == 'number' ? query.start : parseInt( query.start );
            var end = typeof query.end == 'number' ? query.end : parseInt( query.end );
            
            var chunkSize = query.seqChunkSize || ( this.refSeq && this.refSeq.name == query.ref && this.refSeq.seqChunkSize ) || this.seqChunkSize;
            var firstChunk = Math.floor( Math.max( 0, start ) / chunkSize );
            var lastChunk = Math.floor( ( end - 1 ) / chunkSize );

            var seqname    = query.ref;
            var index = this.chrToIndex[seqname];
            
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
                    var blockEnd = ( j + 1 ) * chunkSize;

                    var i = 0;

                    var nBlocksToApply = [];
                    while( header.nBlocks[i] && header.nBlocks[i].start + header.nBlocks[i].size <= blockStart )  {
                        i++;
                    }

                    while( header.nBlocks[i] && header.nBlocks[i].start < blockEnd ) {
                        nBlocksToApply.push( header.nBlocks[i] );
                        i++;
                    }

                    i = 0;
                    var masksToApply = [];
                    while( header.masks[i] && header.masks[i].start + header.masks[i].size <= blockStart ) {
                        i++;
                    }

                    while( header.masks[i] && header.masks[i].start < blockEnd ) {
                        masksToApply.push( header.masks[i] );
                        i++;
                    }

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


