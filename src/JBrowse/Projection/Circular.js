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

   // _normalize: function( args, isAnimating ) {
   //     args = this.inherited(arguments);

   //     if( 'bOffset' in args )
   //         args.bOffset = this._modB(
   //             args.bOffset,
   //             'bLength' in args ? args.bLength : this.bLength,
   //             args.bOrigin || 0
   //         );

   //     return args;
   // },

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
       var b1 = this.projectPoint( a1 );
       var b2 = this.projectPoint( a2 );

       //var bEnd = this.bOrigin + this.bLength;
       var aRange = a2 - a1;
       var bRange = aRange*this.scale;
       var modBOffset = this._modB( this.bOffset, this.bLength, this.bOrigin );

       // wraps one or more times
       if( bRange > this.bLength || b1 > b2 ) {
           //var aLength = this.bLength / this.scale;
           var blocks = [];
           for( var aStart = Math.max( this.aStart, a1 - b1/this.scale );
                aStart < a2 && aStart < this.aEnd;
                aStart = aEnd+1
              ) {
                  var bOffset = modBOffset-this.bLength*blocks.length;
                  var aEnd = Math.min(
                      this.aEnd,
                      (this.bLength-bOffset)/this.scale
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
       // does not wrap
       else {
           return [
               new LinearProjection(
                   {
                       scale: this.scale,
                       bOffset: modBOffset,

                       aName: this.aName,
                       bName: this.bName,

                       aStart: this.aStart,
                       aEnd: this.aEnd
                   })
           ];
       }
   }

});
});
