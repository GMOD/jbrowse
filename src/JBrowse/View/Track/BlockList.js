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

      this.overRender = 400; // additional pixels on each side of the v

      this._ensureBlocks();
      this.projectionWatch = this.projection.watch( lang.hitch( this, '_update' ) );
  },

  _update: function( changeDescription ) {
      var aUpdateProjection = changeDescription.aUpdate;
      if( aUpdateProjection ) {
          this.forEach( function( block ) {
                  block.updatePosition(
                      aUpdateProjection.projectPoint( block.left ),
                      aUpdateProjection.projectPoint( block.right ),
                      changeDescription
                  );
              });
      }
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
      var dims = domGeom.position( this.viewportNode );
      var xMin = dims.x-this.overRender,
          xMax = dims.x+dims.w-1+this.overRender;

      // make blocks on the left
      if( this._leftPx() > xMin ) {
          var projectionBlocks = this.projection.getBlocksForRange( xMin, Math.min( xMax, this._leftPx() ) );
          array.forEach( projectionBlocks.reverse(), function( projectionBlock ) {
              // make one or more rendering blocks for this projection block
              for( var left = this._leftPx(); left > xMin && left > projectionBlock.aStart; left = this._leftPx() ) {
                  if( projectionBlock.aStart >= left )
                      return;
                  this.unshift( this._newBlock(
                                    { left: Math.max( projectionBlock.aStart, xMin-this.overRender ),
                                      right: Math.min( projectionBlock.aEnd, left, xMax+this.overRender )
                                    }
                                ));
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
                  this.push( this._newBlock(
                                 { left:  Math.max( projectionBlock.aStart, xMin-this.overRender, right ),
                                   right: Math.min( projectionBlock.aEnd,   xMax+this.overRender )
                                 }
                             ));
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