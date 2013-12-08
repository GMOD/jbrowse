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

      this._inflightBlockRequests = [];

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

  // track an asynchronous block request so that we don't try twice to
  // fetch the same range
  _trackAsyncBlockRequest: function( deferredProjectionBlocks, direction, limit ) {
      var thisB = this;
      var requestRecord = { blocks: deferredProjectionBlocks, direction: direction, limit: limit };
      this._inflightBlockRequests.push( requestRecord );
      deferredProjectionBlocks.then(
          function() {
              thisB._finishAsyncBlockRequest( requestRecord );
          },
          function(e) {
              if( e != 'parent projection changed' )
                  console.error( e.stack || ''+e );
              thisB._finishAsyncBlockRequest( requestRecord );
          }
      );
  },
  // stop tracking a block-request record, if we are still tracking it
  _finishAsyncBlockRequest: function( requestRecord ) {
      var r = this._inflightBlockRequests;
      for( var i = 0; i<r.length; i++ )
          if( r[i] === requestRecord ) {
              r.splice(i,1);
              return;
          }
  },
  // cancel all in-flight block requests
  _cancelAsyncBlockRequests: function( reason ) {
      var r = this._inflightBlockRequests;
      for( var i = 0; i<r.length; i++ )
          r[i].cancel( reason );
      this._inflightBlockRequests = [];
  },

  // look at our viewport and create or destroy blocks as necessary to
  // cover it
  _ensureBlocks: function( changeDescription ) {
      // update our measurements of the viewport's dimensions only
      // when not in the middle of an animation
      if( !( changeDescription && changeDescription.animating ))
          this._viewportDims = domGeom.position( this._viewportNode );

      // update all the existing blocks
      this.forEach( function( block ) { block.update( changeDescription ); } );

      // don't do any block creation or destruction if we are
      // animating and the main projection is too slow to animate
      // projection block fetching
      if( changeDescription && changeDescription.animating && ! this._projection.isAnimatable() )
          return;

      var thisB = this;

      // if the projection changes while there are requests for blocks
      // in-flight, cancel them.
      this._cancelAsyncBlockRequests('parent projection changed');

      var xMin = this._viewportDims.x-this._idealBlockSize,
          xMax = this._viewportDims.x+this._viewportDims.w-1+this._idealBlockSize;

      // make blocks on the left
      if( this._leftPx() > xMin ) {
          function makeLeft(projectionBlocks) {
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

                             this.unshift( this._newBlock( blockdata, changeDescription ) );
                         }
                  },thisB);
          };
          var projectionBlocks = this._projection.getBlocksForRange( xMin, Math.min( xMax, this._leftPx() ) );
          if( typeof projectionBlocks.then == 'function' ) {
              this._trackAsyncBlockRequest( projectionBlocks );
              projectionBlocks.then( makeLeft );
          } else
              makeLeft( projectionBlocks );
      }
      // prune blocks on the left
      else {
          while( this.first() && this.first().getDims().r < xMin )
              this.shift().destroy( changeDescription );
      }

      // make blocks on the right
      if( this._rightPx() < xMax ) {
          function makeRight( projectionBlocks ) {
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
                                        this.push( this._newBlock( blockdata, changeDescription ) );
                                    }
                             },thisB);
          }
          // if block-getting is deferred, work with that
          var projectionBlocks = this._projection.getBlocksForRange( Math.max( xMin, this._rightPx() ), xMax );
          if( typeof projectionBlocks.then == 'function' ) {
              this._trackAsyncBlockRequest( projectionBlocks );
              projectionBlocks.then( makeRight );
          } else
              makeRight( projectionBlocks );
      }
      // prune blocks on the right
      else {
           while( this.last() && this.last().getDims().l > xMax )
               this.pop().destroy( changeDescription );
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