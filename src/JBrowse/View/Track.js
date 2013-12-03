define([
           'dojo/_base/declare',
           'dojo/dom-class',

           'dijit/layout/ContentPane',

           'JBrowse/_ConfigurationMixin',
           'JBrowse/_FeatureFiltererMixin'
       ],
       function(
           declare,
           domClass,

           ContentPane,

           _ConfigurationMixin,
           _FeatureFiltererMixin
       ) {

return declare( [ ContentPane, _ConfigurationMixin, _FeatureFiltererMixin ], {
  region: 'top',
  baseClass: 'trackView',
  //splitter: true,
  gutters: false,

  buildRendering: function() {
      this.inherited(arguments);
      if( this.trackCSSClass )
          domClass.add( this.domNode, this.baseClass+'-'+this.trackCSSClass );
  },

  // a track view can have its own store, or it can use the store
  // associated with its track object
  _getStoreAttr: function() {
      return this.store || this.get('track').get('store');
  },

  heightUpdate: function(h) {
      if(! ( this.h >= h ) ) {
              this.getParent().heightUpdate( this, h );
              this.h = h;
              this.domNode.style.height = h+'px';
      }
  },

  /**
   * Like getConf, but get a conf value that explicitly can vary
   * feature by feature.  Provides a uniform function signature for
   * user-defined callbacks.
   */
  getConfForFeature: function( path, feature ) {
      return this.getConf( path, [feature, path, null, this ] );
  },

  getProjection: function() {
      try {
          return this.getParent().getParent().getParent().get('projection');
      } catch(e) {
          return undefined;
      }
  },

  _handleError: function(e) {
      console.error( e.stack || ''+e );
  }

});
});
