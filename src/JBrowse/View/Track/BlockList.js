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

      this.newBlock = args.newBlock;
      this.viewportNode = args.viewportNode;

      this.idealBlockSize = 400; // approximate width, in pixels, that we try to make blocks

      this._ensureBlocks();
      this.projectionWatch = this.projection.watch( lang.hitch( this, '_ensureBlocks' ) );
  },

  _leftPx: function() {
      var first = this.first();
      return first ? first.left : Number.POSITIVE_INFINITY;
  },
  _rightPx: function() {
      var last = this.last();
      return last ? last.right : Number.NEGATIVE_INFINITY;
  },

  _ensureBlocks: function( changeDescription ) {
      if( !( changeDescription && changeDescription.animating ))
          this.viewportDims = domGeom.position( this.viewportNode );

      var xMin = this.viewportDims.x-this.idealBlockSize,
          xMax = this.viewportDims.x+this.viewportDims.w-1+this.idealBlockSize;

      // make blocks on the left
      if( this._leftPx() > xMin ) {
          var projectionBlocks = this.projection.getBlocksForRange( xMin, Math.min( xMax, this._leftPx() ) );
          array.forEach( projectionBlocks.reverse(), function( projectionBlock ) {
              var aRange = projectionBlock.getValidRangeA();
              // make one or more rendering blocks for this projection block
              for( var left = this._leftPx();
                   left > xMin && left > aRange.l;
                   left = this._leftPx()
                 ) {
                     var blockdata = {
                         projectionBlock: projectionBlock,
                         blockList: this,
                         idealSize: this.idealBlockSize,
                         left:  Math.max( aRange.l, xMin-this.idealBlockSize ),
                         right: Math.min( aRange.r, left, xMax+this.idealBlockSize )
                     };
                     blockdata.onProjectionBlockLeftEdge  = blockdata.left  == aRange.l;
                     blockdata.onProjectionBlockRightEdge = blockdata.right == aRange.r;

                     this.unshift( this.newBlock( blockdata ) );
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
              var aRange = projectionBlock.getValidRangeA();

              // make one or more rendering blocks for this projection block
              for( var right = this._rightPx();
                   right < xMax && right < aRange.r;
                   right = this._rightPx()
                 ) {
                     var blockdata = {
                         projectionBlock: projectionBlock,
                         blockList: this,
                         idealSize: this.idealBlockSize,
                         left:  Math.max( aRange.l, xMin-this.idealBlockSize, right ),
                         right: Math.min( aRange.r, xMax+this.idealBlockSize )
                     };
                     blockdata.onProjectionBlockLeftEdge  = blockdata.left  == aRange.l;
                     blockdata.onProjectionBlockRightEdge = blockdata.right == aRange.r;
                     this.push( this.newBlock( blockdata ) );
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
      blocks = undefined;

      this.inherited(arguments);
  }

});
});