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
       if( ! this.bLength ) throw new Error('bLength arg required');
   },

   _modB: function( b, length ) {
       if( b >= 0 )
           return  b % length;
       else
           return length + b % length;
   },

   projectPoint: function( a ) {
       var b = this.inherited(arguments);
       return this._modB( b, this.bLength );
   },

   getBlocksForRange: function( a1, a2 ) {
       if( a1 > a2 ) {  // ensure a1 <= a2
           var tmp = a2;
           a2 = a1;
           a1 = tmp;
       }

       var b1 = this.projectPoint( a1 );
       var modBOffset = this._modB( this.bOffset, this.bLength );
       var blocks = [];
       for( var aStart = Math.max( this.aStart, a1 - ( this.scale > 0 ? b1 : b1-this.bLength )/this.scale );
            aStart < a2 && aStart < this.aEnd;
            aStart = aEnd+1
          ) {
              var bOffset = ( this.scale > 0 ? 0 : this.bLength ) - aStart*this.scale;
              var aEnd = Math.min(
                  this.aEnd,
                  ((this.scale > 0 ? this.bLength : 0 )-bOffset)/this.scale
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
