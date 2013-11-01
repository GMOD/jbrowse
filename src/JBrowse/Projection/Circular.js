define([
           'dojo/_base/declare',

           '../Projection',
           './ContinuousLinear',
           './_CanonicalZoomLevelsMixin',
           './_ChildBlock'
       ],
       function(
           declare,

           ProjectionBase,
           LinearProjection,
           _CanonicalZoomLevelsMixin,
           ChildBlock
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
       var tmp;
       if( a1 > a2 ) {  // ensure a1 <= a2
           tmp = a2;
           a2 = a1;
           a1 = tmp;
       }
       a1 = Math.max( this.aStart, a1 );
       a2 = Math.min( this.aEnd,   a2 );
       if( a1 >= a2 )
           return [];

       var bMin = ( this.scale > 0 ? a1 : a2 ) * this.scale + this.bOffset;
       var bMax = ( this.scale > 0 ? a2 : a1 ) * this.scale + this.bOffset;
       var childOffset = this._modB( bMin, this.bLength ) - bMin;
       var minOffset = this._modB( bMax,this.bLength ) - bMax;
       var blocks = [];
       for( ; childOffset >= minOffset; childOffset -= this.bLength ) {
           blocks.push(
               new ChildBlock({ parent: this,
                                childOffset: childOffset,
                                aName: this.aName,
                                bName: this.bName
                              })
           );
       }
       return blocks;
   }
});
});
