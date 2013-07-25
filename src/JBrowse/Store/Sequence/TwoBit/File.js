define ([
        'dojo/_base/declare',
        'dojo/_base/array',
        'JBrowse/Model/XHRBlob',
        'dojo/Deferred',
        'dojo/when',
        'dojo/promise/all'
    ], function(declare, array, XHRBlob, Deferred, when, all ) {
        
        var TWOBIT_MAGIC =[ 26, 65, 39, 67];

        return declare(null, {

        constructor: function(args) {
            this.numSeqs = 0;

            this.byteSwapped = false;
            this.data = args.data;
            this.store = args.store;
            this.maxChunkSize = args.maxChunkSize || 5000000;

            this.chunkCache   = {};
            this.seqChunkSize = args.seqChunkSize;
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
                    this.chrToIndex[this._toString(results, i, i+nameSize)] = seqIndex; i += nameSize;
                    this.offset[seqIndex] = this._toInteger(results, i, i + 4); i += 4;
                }
                console.log(this.chrToIndex, this.offset);
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
                console.log(header);
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
                blockLength = Math.max( 0, Math.min( blockLength, end - nBlocks[i].start ) );
                retString = [ retString.slice( 0, blockStart ), this._nBlock( blockLength ), retString.slice( blockStart + blockLength ) ].join( "" );
            }
            return retString;
        },

        _applyMasks: function( baseString, start, end, masks ) {
            var retString = baseString;
            for( var i in masks ) {
                var maskStart = Math.max( 0, masks[i].start - start );
                var maskLength = masks[i].size + Math.min( 0, masks[i].start - start );
                console.log(masks[i].start, masks[i].size, maskStart, maskLength);
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
            var seqname    = query.ref;
            var index = this.chrToIndex[seqname];
            
            var i = 0;

            var nBlocksToApply = [];

            while( header.nBlocks[i] && header.nBlocks[i].start + header.nBlocks[i].size <= start)  {
                i++;
            }

            while( header.nBlocks[i] && header.nBlocks[i].start < end ) {
                nBlocksToApply.push( header.nBlocks[i] );
                i++;
            }

            i = 0;
            var masksToApply = [];
            while( header.masks[i] && header.masks[i].start + header.masks[i].size <= start ) {
                i++;
            }

            while( header.masks[i] && header.masks[i].start < end ) {
                masksToApply.push( header.masks[i] );
                i++;
            }

            // dataStart and dataEnd are still in bp, so we must convert them to bytes.
            var byteStart = header.dnaStart + Math.floor( start / 4 );

            var byteEnd = header.dnaStart + Math.ceil( end / 4 );
            var byteLength = byteEnd - byteStart - 1;

            if( byteLength >= 0) {
                console.log( byteStart, byteLength );
                this.data.read(byteStart, byteLength, dojo.hitch( this, function( results ) {
                    var byteArray = this._toByteArray( results );
                    var baseString = this._toBaseString( byteArray );
                    baseString = this._applyNBlocks( baseString, start, end, nBlocksToApply );
                    baseString = this._applyMasks( baseString, start, end, masksToApply );
                    console.log( baseString );
                }), errorCallback );
            }

        }
    
});

});


