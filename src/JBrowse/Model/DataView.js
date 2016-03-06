/**
 * Subclass of jDataView with a getUint64 method.
 */
define([
           'jDataView'
       ],
       function( jDataView ) {

var DataView = function() {
    jDataView.apply( this, arguments );
};

try {
    DataView.prototype = new jDataView( new ArrayBuffer([1]), 0, 1 );
} catch(e) {
    console.error(e);
}

/**
 * Get a 53-bit integer from 64 bits and approximate the number if it overflows.
 */
DataView.prototype.getUint64Approx = function( byteOffset, littleEndian ) {
    var b = this._getBytes(8, byteOffset, littleEndian);
    var result = b[0] * Math.pow(2,56) + b[1]*Math.pow(2,48) + b[2]*Math.pow(2,40) + b[3]*Math.pow(2,32) +  b[4]*Math.pow(2, 24) + (b[5]<<16) + (b[6]<<8) + b[7];

    if( b[0] || b[1]&224 ) {
        result = Number(result);
        result.overflow = true;
    }

    return result;
};

/**
 * Get a 53-bit integer from 64 bits and throw if it overflows.
 */
DataView.prototype.getUint64 = function( byteOffset, littleEndian ) {
    var result = this.getUint64Approx( byteOffset, littleEndian );
    if( result.overflow )
        throw new Error('integer overflow');
    return result;
};


return DataView;

});
