define([
           'dojo/_base/declare',

           './ContinuousLinear',
           './_CanonicalZoomLevelsMixin'
       ],
       function(
           declare,

           LinearProjection,
           _CanonicalZoomLevelsMixin
       ) {

return declare( 'JBrowse.Projection.Circular', [ LinearProjection,_CanonicalZoomLevelsMixin ], {

   constructor: function(args) {
       if( ! this.bOrigin ) this.bOrigin = 0;
       if( ! this.bLength ) throw new Error('bLength arg required');
   },

   _modB: function( b, length, origin ) {
       if( b >= origin )
           return ( b - origin ) % length + origin;
       else
           return length + origin - ( origin - b ) % length;
   },

   projectPoint: function( a ) {
       var b = this.inherited(arguments);
       return this._modB( b, this.bLength, this.bOrigin );
   },

   getBlocksForRange: function( a1, a2 ) {
       if( a1 > a2 ) {  // ensure a1 <= a2
           var tmp = a2;
           a2 = a1;
           a1 = tmp;
       }

       var b1 = this.projectPoint( a1 );
       var modBOffset = this._modB( this.bOffset, this.bLength, this.bOrigin );
       var blocks = [];
       for( var aStart = Math.max( this.aStart, a1 - ( this.scale > 0 ? b1 : b1-this.bLength )/this.scale );
            aStart < a2 && aStart < this.aEnd;
            aStart = aEnd+1
          ) {
              var bOffset = modBOffset + ( this.scale > 0 ? -1 : 1 )*this.bLength*blocks.length;
              var aEnd = Math.min(
                  this.aEnd,
                  ( ( this.scale > 0 ? this.bLength : 0 ) - bOffset ) / this.scale
              );
              blocks.push(
                  new LinearProjection(
                      {
                          scale:  this.scale,
                          bOffset: bOffset,
                          aName:  this.aName,
                          bName:  this.bName,

                          aStart:  aStart,
                          aEnd:    aEnd
                      })
              );
          }
       return blocks;
   }

});
});
