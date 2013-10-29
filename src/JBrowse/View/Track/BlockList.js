define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-geometry',

           'JBrowse/Model/LinkedList'
       ],

       function(
           declare,
           lang,
           array,
           domGeom,

           LinkedList
       ) {

return declare( LinkedList, {

  constructor: function( args ) {
      this._projection = args.projection;

      this._newBlock = args.newBlock;
      this._viewportNode = args.viewportNode;

      this._idealBlockSize = args.idealBlockSize || 400; // approximate width, in pixels, that we try to make blocks

      this._ensureBlocks();
      this._projectionWatch = this._projection.watch( lang.hitch( this, '_ensureBlocks' ) );
  },

  _leftPx: function() {
      var first = this.first();
      return first ? first.getDims().l : Number.POSITIVE_INFINITY;
  },
  _rightPx: function() {
      var last = this.last();
      return last ? last.getDims().r : Number.NEGATIVE_INFINITY;
  },

  _ensureBlocks: function( changeDescription ) {
      if( !( changeDescription && changeDescription.animating ))
          this._viewportDims = domGeom.position( this._viewportNode );

      // update all the existing blocks
      this.forEach( function( block ) { block.update( changeDescription ); } );


      var xMin = this._viewportDims.x-this._idealBlockSize,
          xMax = this._viewportDims.x+this._viewportDims.w-1+this._idealBlockSize;

      // make blocks on the left
      if( this._leftPx() > xMin ) {
          var projectionBlocks = this._projection.getBlocksForRange( xMin, Math.min( xMax, this._leftPx() ) );
          projectionBlocks.sort(
              function(a,b) {
                  return b.getValidRangeA().l - a.getValidRangeA().l;
              });
          array.forEach( projectionBlocks, function( projectionBlock ) {
              var aRange = projectionBlock.getValidRangeA();
              // make one or more rendering blocks for this projection block
              for( var left = this._leftPx();
                   left > xMin && left > aRange.l;
                   left = this._leftPx()
                 ) {
                     var blockdata = {
                         projectionBlock: projectionBlock,
                         blockList: this,
                         idealSize: this._idealBlockSize,
                         left:  Math.max( aRange.l, xMin-this._idealBlockSize ),
                         right: Math.min( aRange.r, left, xMax+this._idealBlockSize )
                     };
                     blockdata.onProjectionBlockLeftEdge  = blockdata.left  == aRange.l;
                     blockdata.onProjectionBlockRightEdge = blockdata.right == aRange.r;

                     this.unshift( this._newBlock( blockdata ) );
                 }
          },this);
      }
      // prune blocks on the left
      else {
          while( this.first() && this.first().getDims().r < xMin )
              this.shift().destroy();
      }

      // make blocks on the right
      if( this._rightPx() < xMax ) {
          var projectionBlocks = this._projection.getBlocksForRange( Math.max( xMin, this._rightPx() ), xMax );
          projectionBlocks.sort(
              function(a,b) {
                  return a.getValidRangeA().l - b.getValidRangeA().l;
              });
          array.forEach( projectionBlocks, function( projectionBlock ) {
              var aRange = projectionBlock.getValidRangeA();

              // make one or more rendering blocks for this projection block
              for( var right = this._rightPx();
                   right < xMax && right < aRange.r;
                   right = this._rightPx()
                 ) {
                     var blockdata = {
                         projectionBlock: projectionBlock,
                         blockList: this,
                         idealSize: this._idealBlockSize,
                         left:  Math.max( aRange.l, xMin-this._idealBlockSize, right ),
                         right: Math.min( aRange.r, xMax+this._idealBlockSize )
                     };
                     blockdata.onProjectionBlockLeftEdge  = blockdata.left  == aRange.l;
                     blockdata.onProjectionBlockRightEdge = blockdata.right == aRange.r;
                     this.push( this._newBlock( blockdata ) );
                 }
          },this);
      }
      // prune blocks on the right
      else {
           while( this.last() && this.last().getDims().l > xMax )
               this.pop().destroy();
      }
  },

  destroy: function() {
      this._projectionWatch.remove();

      var blocks = [];
      this.forEach( function( block ) {
                        blocks.push(block);
                    });
      array.forEach( blocks, function(block) {
                         block.destroy();
                     });
      blocks = undefined;

      this.inherited(arguments);
  }

});
});