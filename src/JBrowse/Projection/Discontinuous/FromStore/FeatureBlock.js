define([
            'dojo/_base/declare',

            '../../_ChildBlock'
        ],
        function(
            declare,

           ChildBlock
        ) {

return declare( ChildBlock, {
  constructor: function(args) {
      this.bMax = args.bMax;
      this.bOffset = args.bOffset;
  },

  // for serialization with JBrowse/Util/Serialization
  deflate: function() {
      var d = this.inherited(arguments);
      d.$class = 'JBrowse/Projection/Discontinuous/FromStore/FeatureBlock';
      d.bMax = this.bMax;
      d.bOffset = this.bOffset;
      return d;
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
});