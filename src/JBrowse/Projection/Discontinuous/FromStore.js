define([
           'dojo/_base/declare',

           '../_ChildBlock',
           '../ContinuousLinear'
       ],
       function(
           declare,

           ChildBlock,
           ContinuousLinear
       ) {

var FeatureBlock = declare( ChildBlock, {
  constructor: function(args) {
      this.bMax = args.bMax;
      this.bOffset = args.bOffset;
  },

  getValidRangeA: function() {
      var parent = this.parent;
      var aStart = parent.reverseProjectPoint( -this.childOffset );
      var aEnd = parent.reverseProjectPoint( this.bMax );

      if( aStart > aEnd ) {
          var tmp = aStart;
          aStart = aEnd;
          aEnd = tmp;
      }

      return {
          l: Math.max( aStart, parent.aStart ),
          r: Math.min( aEnd, parent.aEnd )
      };
  }
});

return declare( ContinuousLinear, {

  isAnimatable: function() {
      return true;
  },

  getValidRangeA: function() {
      return this._getBlocks()
          .then( function( blocks ) {
                     return { l: this.bOffset/this.scale,
                              r: blocks[ blocks.length-1 ].bMax/this.scale
                            };
                 });
  },

  _getBlocks: function() {
      return this.__getBlocks || ( this.__getBlocks = function() {
          var features = [];
          var thisB = this;
          return this.store.getFeatures( this.storeQuery || {} )
                     .forEach(
                         function(f) {
                             features.push(f);
                         },
                         function() {
                             return thisB._makeBlocks( features );
                         }
                     );
      }.call(this));
  },

  _makeBlocks: function( features ) {
      var blocks = [];
      var childOffset = 0;
      features.sort( function(a,b) {
          return a.get('start') - b.get('start');
      });

      var currPlus = {};
      var currMinus = {};
      function pushRec(curr) {
          curr.childOffset = childOffset;
          blocks.push( curr );
          childOffset -= curr.end - curr.start;
      };
      for( var i = 0; i<features.length; i++ ) {
          var f = features[i];
          var curr = f.get('strand') == -1 ? currMinus : currPlus;
          if( f.get('seq_id') == curr.ref && f.get('start') < curr.end ) {
              // add to the current block
              curr.end = Math.max( f.get('end'), curr.end );
          }
          else {
              // start a new block
              if( curr.ref )
                  pushRec( curr );

              curr = { ref: f.get('seq_id'), start: f.get('start'), end: f.get('end'), strand: f.get('strand') };
              if( f.get('strand') == -1 )
                  currMinus = curr;
              else
                  currPlus = curr;
          }
      }

      if( currPlus.ref )
          pushRec( currPlus );
      if( currMinus.ref )
          pushRec( currMinus );

      // instantiate all the blocks
      for( var i = 0; i<blocks.length; i++ ) {
          var curr = blocks[i];
          blocks[i] = new FeatureBlock(
              {
                  parent: this,
                  childOffset: curr.childOffset,
                  bOffset: curr.start,
                  bMax: curr.end - curr.start - curr.childOffset,
                  aName: this.aName,
                  bName: curr.ref
              });
      }

      return blocks;
  },

  // binary search through block array for first block overlapping range b1 - b2
  _findIndexOfFirstBlockInRange: function( b1, b2, blocks, offset, length ) {
      if( ! length )
          return undefined;

      var centerIndex = Math.floor(length/2)+offset;
      //console.log( b1, b2, offset, length, centerIndex );

      var centerBlock = blocks[centerIndex];
      if( ! centerBlock ) // not found
          return undefined;

      if( !( centerBlock.bMax < b1 || -centerBlock.childOffset > b2 ) ) {
          // this block overlaps

          if( centerBlock.childOffset < b1 || centerIndex == 0 )
              // this is the first overlapping block
              return centerIndex;
          else
              // go lower
              return this._findIndexOfFirstBlockInRange( b1, b2, blocks, offset, centerIndex-offset );
      }
      else {
          // does not overlap

          if( centerBlock.bMax < b1 )
              // go higher
              return this._findIndexOfFirstBlockInRange( b1, b2, blocks, centerIndex+1, offset+length-1-centerIndex );
          else
              // go lower
              return this._findIndexOfFirstBlockInRange( b1, b2, blocks, offset, centerIndex-offset );
     }
  },

  getBlocksForRange: function( a1, a2 ) {
      var thisB = this;
      var b1 = this.projectPoint(a1);
      var b2 = this.projectPoint(a2);
      if( b1 > b2 ) {
          var tmp = b2;
          b2 = b1;
          b1 = tmp;
      }

      return this._getBlocks()
          .then( function( blocks ) {
                     var relevantBlocks = [];
                     var i = thisB._findIndexOfFirstBlockInRange( b1, b2, blocks, 0, blocks.length );
                     for( ; i < blocks.length && -blocks[i].childOffset < b2; i++ )
                         relevantBlocks.push( blocks[i] );
                     return relevantBlocks;
                 });
  }

});
});
