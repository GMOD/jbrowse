define([
           'dojo/_base/declare',
           'dojo/_base/lang'
       ],
       function(
           declare,
           lang
       ) {

return declare( null, {



_normalize: function( vals, isAnimating ) {
    vals = this.inherited( arguments );

    if( ! isAnimating && 'scale' in vals )
        return lang.mixin( {}, vals, { scale: this._canonicalizeScale( vals.scale ) } );

    return vals;
},

/**
 * Given an input scale (px/bp), find the canonical scale that is
 * nearest to it (and within the configured minimum and maximum
 * scales).
 */
_canonicalizeScale: function( scale ) {
    if( scale === undefined )
        return undefined;

    // find the nearest {1,2,5}*10^x greater than min
    var min = 0.01;
    if( Math.abs(scale) <= min )
        return scale < 0 ? -min : min;

    var exponential = new Number( scale ).toExponential().split( /e/i );
    var significand = parseFloat( exponential[0] );
    var exponent    =   parseInt( exponential[1] );

    if( significand > 0 ) {
        significand = significand > 3.5
            ? ( significand > 7.5 ? 10 : 5 )
            : ( significand > 1.5 ?  2 : 1 );
    }
    else {
        significand = significand < -3.5
            ? ( significand < -7.5 ? -10 : -5 )
            : ( significand < -1.5 ?  -2 : -1 );
    }
    return significand * Math.pow( 10, exponent );
}

});
});