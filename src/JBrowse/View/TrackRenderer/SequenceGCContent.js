define([
           'dojo/_base/declare'

           ,'JBrowse/View/TrackRenderer/XYPlot'
           ,'JBrowse/Store/SeqFeature/SequenceGCContent'
       ],
       function(
           declare
           ,XYPlot
           ,SequenceGCStore
       ) {

return declare( XYPlot,  {

  configSchema: {
      slots: [
          { name: 'minScore', defaultValue: 0   },
          { name: 'maxScore', defaultValue: 100 },
          { name: 'autoscale', defaultValue: 'global' }
      ]
  },

  postCreate: function() {
      this.set('store', new SequenceGCStore(
          { store: this.get('store'),
            app: this.get('app')
          }));
  }
});
});