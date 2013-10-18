define([
           'dojo/_base/declare',
           'dojo/Deferred',

           './ContinuousLinear',
           'JBrowse/Util'
       ],
       function(
           declare,
           Deferred,

           LinearProjection,
           Util
       ) {

return declare( 'JBrowse.Projection.Circular', LinearProjection, {

   constructor: function(args) {

       this.bOrigin = args.bOrigin || 0;

       if( ! args.bLength ) throw new Error('bLength arg required');
       this.bLength = args.bLength;

       this.bOffset = this._modB( this.bOffset );
   },

   _modB: function( b ) {
       return ( b - this.bOrigin ) % this.bLength + this.bOrigin;
   },

   projectPoint: function( a ) {
       var b = this.inherited(arguments);
       return this._modB( b );
   },

   getBlocksForRange: function( a1, a2 ) {
       var b1 = this.projectPoint( a1 );
       var b2 = this.projectPoint( a2 );

       var bEnd = this.bOrigin + this.bLength;
       var aRange = a2 - a1;
       var bRange = aRange*this.scale;
       // wraps one or more times
       if( bRange > this.bLength || b1 > b2 ) {
           var aLength = this.bLength / this.scale;
           var blocks = [];
           for( var aStart = this.aStart; aStart < a2 && aStart < this.aEnd; aStart = aEnd+1) {
               var bOffset = this.bOffset-this.bLength*blocks.length;
               var aEnd = Math.min(
                   this.aEnd,
                   (this.bLength-bOffset)/this.scale
               );
               blocks.push(
                   new LinearProjection(
                       {
                           scale:  this.scale,
                           offset: bOffset,
                           aName:  this.aName,
                           bName:  this.bName,

                           start:  aStart,
                           end:    aEnd
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
                       offset: this.bOffset,

                       aName: this.aName,
                       bName: this.bName,

                       start: this.aStart,
                       end: this.aEnd
                   })
           ];
       }
   },

   setTo: function( endScale, endOffset ) {
      this.scale   = endScale;
      this.bOffset = this._modB( endOffset );
      this._notifyChangedAll({ scale: this.scale, offset: this.bOffset });
   }

});
});
