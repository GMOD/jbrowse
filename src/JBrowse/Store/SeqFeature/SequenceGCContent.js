/**
 * Store that encapsulates a reference sequence store and emits
 * quantitative features for the GC content of the reference sequence.
 */
define([
           'dojo/_base/declare'

           ,'JBrowse/Store/SeqFeature'
           ,'JBrowse/Util'
           ,'JBrowse/Util/DeferredGenerator'
           ,'JBrowse/View/TrackRenderer/XYPlot'
           ,'JBrowse/Model/SimpleFeature'
       ],
       function(
           declare

           ,SeqFeatureStore
           ,Util
           ,DeferredGenerator
           ,XYPlot
           ,SimpleFeature
       ) {

var isGC = {g:true,G:true,c:true,C:true};

return declare( SeqFeatureStore, {
  constructor: function(args) {
      Util.validate( args, { store: 'object' } );
      this.seqStore = args.store;
      this.windowSize = args.windowSize;
  },
  configSchema: {
      slots: [
          { name: 'type', defaultValue: 'JBrowse/Store/SeqFeature/SequenceGCContent' }
      ]
  },

  deflate: function() {
      var d = this.inherited(arguments);
      d.store = this.seqStore.deflate();
      d.windowSize = this.windowSize;
      return d;
  },

  getFeatures: function( query ) {
      var thisB = this;
      var binSize = query.basesPerSpan  ?  query.basesPerSpan :
                            query.scale ?  1/query.scale      :
                                           500;
      var windowSize = thisB.windowSize || 5*binSize;
      var seqStart = Math.floor(query.start-windowSize/2), seqEnd = Math.ceil(query.end+windowSize/2);
      var seqOffset = query.start-seqStart;
      return new DeferredGenerator( function( generator ) {
          return thisB.seqStore.getReferenceSequence( query.ref, seqStart, seqEnd )
                     .then( function( seq ) {

                        var binCount = Math.ceil( (query.end-query.start) / binSize );

                        for( var i = 0; i<binCount; i++ ) {
                            generator.emit( new SimpleFeature(
                                                { data: {
                                                      start: query.start +     i*binSize,
                                                      end:   query.start + (i+1)*binSize,
                                                      score: thisB._calcGC( seq, i*binSize+seqOffset, windowSize )
                                                  }
                                                }));
                        }
                    });
      });
  },

  _calcGC: function( seq, offset, windowSize ) {
      var halfWin = Math.ceil( windowSize/2 );
      var start = Math.max( 0, offset-halfWin );
      var end   = Math.min( offset+halfWin, seq.length-1 );
      var subseq = seq.substring( start, end ).replace(/\s+/g,'');
      var gcCount = 0;
      for( var i = 0; i<subseq.length; i++ )
          if( isGC[subseq.charAt(i)] )
              gcCount++;
      return 100*gcCount/subseq.length;
  }
});
});
