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
      this.projection = args.projection;

      this._newBlock = args.newBlock;
      this.viewportNode = args.viewportNode;

      this.idealSize = 400; // approximate width, in pixels, that we try to make blocks

      this.viewportDims = domGeom.position( this.viewportNode );
      this._ensureBlocks();
      this.projectionWatch = this.projection.watch( lang.hitch( this, '_update' ) );
  },

  _update: function( changeDescription ) {
      var aUpdateProjection = changeDescription.aUpdate;
      if( aUpdateProjection ) {
          this.forEach( function( block ) {
                  var
                      //l    = !block.onProjectionBlockLeftEdge && block.prev()  ? block.prev().right+1 : aUpdateProjection.projectPoint( block.left  ),
                      //r    = aUpdateProjection.projectPoint( !block.onProjectionBlockRightEdge && block.next() ? block.next().left-1 : block.right ),
                      l    = aUpdateProjection.projectPoint( block.left  ),
                      r    = aUpdateProjection.projectPoint( block.right ),
                      w    = r-l+1,
                      prev = block.prev();

                  // if we know how to merge blocks, and it would be a good idea to merge this block with the previous one, do it
                  if( prev                                  //< there is a previous block
                      //&& ! changeDescription.animating
                      && !block.onProjectionBlockLeftEdge   //< they are both in the same projection block
                      && (prev.width() < this.idealSize/5 || w < this.idealSize/5) //< at least one of the blocks is pretty small
                      && ( prev.width() + w <= this.idealSize*2 )  //< the merged block would not be bigger than 2x ideal size
                    ) {
                        prev.mergeRight( block, l, r, changeDescription );
                        this._remove( block );
                        block.destroy();
                  } else {
                      // otherwise just resize it
                      block.updatePosition( l, r, changeDescription );
                  }
              });
      }

      //if( ! changeDescription.animating )
          this.viewportDims = domGeom.position( this.viewportNode );

      this._ensureBlocks();
  },

  _leftPx: function() {
      var first = this.first();
      return first ? first.left : Number.POSITIVE_INFINITY;
  },
  _rightPx: function() {
      var last = this.last();
      return last ? last.right : Number.NEGATIVE_INFINITY;
  },

  _ensureBlocks: function() {
      var xMin = this.viewportDims.x-this.idealSize,
          xMax = this.viewportDims.x+this.viewportDims.w-1+this.idealSize;

      // make blocks on the left
      if( this._leftPx() > xMin ) {
          var projectionBlocks = this.projection.getBlocksForRange( xMin, Math.min( xMax, this._leftPx() ) );
          array.forEach( projectionBlocks.reverse(), function( projectionBlock ) {
              // make one or more rendering blocks for this projection block
              for( var left = this._leftPx(); left > xMin && left > projectionBlock.aStart; left = this._leftPx() ) {
                  if( projectionBlock.aStart >= left )
                      return;
                  var blockdata = {
                      left:  Math.max( projectionBlock.aStart, xMin-this.idealSize ),
                      right: Math.min( projectionBlock.aEnd, left, xMax+this.idealSize )
                  };
                  blockdata.onProjectionBlockLeftEdge  = blockdata.left  == projectionBlock.aStart;
                  blockdata.onProjectionBlockRightEdge = blockdata.right == projectionBlock.aEnd;

                 this.unshift( this._newBlock( blockdata ) );
              }
          },this);
      }
      // prune blocks on the left
      else {
          while( this.first() && this.first().right < xMin )
              this.shift().destroy();
      }

      // make blocks on the right
      if( this._rightPx() < xMax ) {
          var projectionBlocks = this.projection.getBlocksForRange( Math.max( xMin, this._rightPx() ), xMax );
          array.forEach( projectionBlocks, function( projectionBlock ) {
              // make one or more rendering blocks for this projection block
              for( var right = this._rightPx(); right < xMax && right < projectionBlock.aEnd; right = this._rightPx() ) {
                  if( projectionBlock.aEnd <= right )
                      return;
                  var blockdata = {
                      left:  Math.max( projectionBlock.aStart, xMin-this.idealSize, right ),
                      right: Math.min( projectionBlock.aEnd,   xMax+this.idealSize )
                  };
                  blockdata.onProjectionBlockLeftEdge  = blockdata.left  == projectionBlock.aStart;
                  blockdata.onProjectionBlockRightEdge = blockdata.right == projectionBlock.aEnd;
                  this.push( this._newBlock( blockdata ) );
              }
          },this);
      }
      // prune blocks on the right
      else {
           while( this.last() && this.last().left > xMax )
               this.pop().destroy();
      }
  },

  destroy: function() {
      this.projectionWatch.remove();
      var blocks = [];
      this.forEach( function( block ) {
                        blocks.push(block);
                    });
      array.forEach( blocks, function(block) {
                         block.destroy();
                     });

      this.inherited(arguments);
  }

});
});