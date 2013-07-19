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
            this.indexOf = {};
            this.offset = [];
            var maxLength = 256; // Since namesize is one byte, there are at most 256 bytes used for each name.
            this.data.read(16, this.numSeqs*(maxLength + 5), dojo.hitch(this, function(results) {
                var i = 0;
                for(var seqIndex = 0; seqIndex < this.numSeqs; seqIndex++) {
                    var nameSize = this._toInteger(results, i, i+1); i++;
                    this.indexOf[this._toString(results, i, i+nameSize)] = seqIndex; i = i + nameSize;
                    this.offset[seqIndex] = this._toInteger(results, i, i + 4); i += 4;
                }
                console.log(this.indexOf, this.offset);
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
        }
    
});

});


