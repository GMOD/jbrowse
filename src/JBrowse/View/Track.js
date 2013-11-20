define([
           'dojo/_base/declare',

           'dijit/_WidgetBase',

           'JBrowse/Component'
       ],
       function(
           declare,

           _WidgetBase,

           Component
       ) {

return declare( [ _WidgetBase, Component ], {
  region: 'top',
  baseClass: 'track-view',

  // buildRendering: function() {
  //     this.inherited( arguments );
  // },

  // a view can have its own store, or it can use a store associated
  // with its track object
  _getStoreAttr: function() {
      return this.store || this.get('track').get('store');
  },

  startup: function() {
      this.set('genomeView', this.genomeView );
  },

  heightUpdate: function(h) {
      if(! ( parseFloat(this.domNode.style.height) > h ) )
          this.domNode.style.height = h+'px';
  },

  _handleError: function(e) {
      console.error( e.stack || ''+e );
  }

});
});
