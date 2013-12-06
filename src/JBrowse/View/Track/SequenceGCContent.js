define([
           'dojo/_base/declare'


           ,'JBrowse/Store/SeqFeature'
           ,'JBrowse/Util/DeferredGenerator'
           ,'JBrowse/View/Track/XYPlot'
           ,'JBrowse/Model/SimpleFeature'
       ],
       function(
           declare

           ,SeqFeatureStore
           ,DeferredGenerator
           ,XYPlot
           ,SimpleFeature
       ) {

var isGC = {g:true,G:true,c:true,C:true};

var SequenceGCStore = declare( SeqFeatureStore, {
  constructor: function(args) {
      this.seqStore = args.store;
      this.windowSize = args.windowSize;
  },
  getFeatures: function( query ) {
      var thisB = this;
      return new DeferredGenerator( function( generator ) {
          return thisB.seqStore.getReferenceSequence( query.ref, query.start, query.end )
                     .then( function( seq ) {
                        var binSize = query.basesPerSpan  ?  query.basesPerSpan :
                                              query.scale ?  1/query.scale      :
                                                             1;

                        var windowSize = thisB.windowSize || ( 5*binSize );

                        var binCount = Math.ceil( seq.length / binSize );

                        for( var i = 0; i<binCount; i++ ) {
                            generator.emit( new SimpleFeature(
                                                { data: {
                                                      start: query.start+i*binSize,
                                                      end: query.start+(i+1)*binSize,
                                                      score: thisB._calcGC( seq, i*binSize, windowSize )
                                                  }
                                                }));
                        }
                    });
      });
  },

  _calcGC: function( seq, offset, windowSize ) {
      var halfWin = Math.ceil( windowSize/2 );
      var start = Math.max( 0, offset-halfWin );
      var end   = Math.max( offset+halfWin, seq.length-1 );
      var winSize = end - start + 1;
      var subseq = seq.substring( start, end );
      var gcCount = 0;
      for( var i = 0; i<subseq.length; i++ )
          if( isGC[subseq.charAt(i)] )
              gcCount++;
      return gcCount/winSize;
  }
});

return declare( XYPlot,  {
  postCreate: function() {
      this.set('store', new SequenceGCStore(
          { store: this.get('store'),
            app: this.get('app')
          }));
  }
});
});