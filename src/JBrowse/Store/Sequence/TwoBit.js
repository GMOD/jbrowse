var TWOBIT_MAGIC = /* enter magic value here */

byteToBases: function( byte ) {
    var bitsToBase = ["T", "C", "A", "G"];
    var firstFour = (byte >> 4) & 0xf;
    var lastFour = byte & 0xf;

    var first = (firstFour >> 2) & 0x3;
    var second = firstFour & 0x3;
    var third = (lastFour >> 2) & 0x3;
    var fourth = lastFour & 0x3;

    var bitArray = [first, second, third, fourth];

    return bitArray.map( function(value){
        return bitsToBase[value];
    });
},

_load2bitHeader: function(successCallback, failureCallback) {
    var byteSwapped = false;
    this.data.read(0, 32 /* or 31 */, dojo.hitch(this, function(r) {
        var headerArray = new Uint32Array(r);
        var signature = header[0];
        if(signature != TWOBIT_MAGIC) {
            if(this.byteSwap(signature) == TWOBIT_MAGIC) {
                byteSwapped = true;
            } else {
                failureCallback("Not a .2bit file");
                return;
            }
        }
        var numSeq = byteSwapped ? this.byteSwap(header[2]) : header[2];

        this._load2bitIndex(numSeq, byteSwapped, successCallback, failureCallback);

    }), failureCallback);
},

_load2bitIndex: function(numSeq, byteSwapped, successCallback, failureCallback) {
    this.refSeqIndex = [];
    this.nextOffset = 32;
    
    for(var i = 0; i < numSeq; i++) {
        var nameSize = this.readBytes();
        var name = this.bytesToString(this.readBytes(nameSize));
        var index = {name: name, offset: this.readInt(byteSwapped, 4) )};
        refSeqIndex.push(index);

        this._loadSequence(byteSwapped, index);
    }
},

_loadSequence: function(byteSwapped, index) {
    this.nextOffset = index.offset;
    var dnaSize = this.readInt(byteSwapped, 4);
    var nBlockCount = this.readInt(byteSwapped, 4);
    var nBlockStarts = [];
    var nBlockSizes = [];
    for(var i = 0; i < nBlockCount; i++) {
        nBlockSizes.push(this.readInt(byteSwapped, 4, this.nextOffset + 8*nBlockCount));
        nBlockStarts.push(this.readInt(byteSwapped, 4));
    }
    this.nextOffset += 8*nBlockCount;
    
    var maskBlockCount = this.readInt(byteSwapped, 4);
    var maskBlockStarts = [];
    var maskBlockSizes = [];

    for(var i = 0; i < nBlockCount; i++) {
        maskBlockSizes.push(this.readInt(byteSwapped, 4, this.nextOffset + 8*maskBlockCount));
        maskBlockStarts.push(this.readInt(byteSwapped, 4));
    }
    this.nextOffset += 8*maskBlockCount;

    this.nextOffset += 8; // reserved section: all zero.
},

bytesToString: function( byteArray ) {
    var retString = "";
    for(var index in byteArray) {
        retString = retString + String.fromCharCode(byteArray[index]);
    }
    return retString;
},

readInt: function (swapped, intSize, offset) {
    swapped = swapped || false;
    var byteArray = this.readBytes(intSize, offset);
    return this.bytesToInteger(swapped ? this.byteSwap(byteArray) : byteArray);
},

bytesToInteger: function( byteArray ) {
    var retInt = 0;
    for(var i = 0; i < byteArray.length; i++) {
        retInt = retInt + (byteArray[i] << (byteArray.length - 1 - i));
    }
    return retInt;
},


readBytes: function( numBytes, offset ) {

    if(offset === undefined) {
        offset = this.nextOffset;
        var useNextOffset = true;
    }


    if(numBytes === undefined)
        numBytes = 1;

    var retBytes;
    this.data.read(offset, numBytes*2, function(r) {
        retBytes = new UInt8Array(r);
        if(retBytes.length == 1) {
            retBytes = retBytes[0];
        }
    });

    if(useNextOffset)
        this.nextOffset = offset + numBytes*2;

    return retBytes;
},

byteSwap: function( origValue ) {
    if(origValue.length > 1)
        return origValue.reverse();
    else
        return origValue;
},

constructor: function(args) {
    
    this.data = args.data;
    this.store = args.store;
    this.maxChunkSize = args.maxChunkSize || 5000000;
},

init: function( args ) {
    var successCallback = args.success || function() {};
    var failureCallback = args.failure || function(e) {console.error(e, e.stack); };

    this._load2bitHeader(successCallback, failureCallback);
}


