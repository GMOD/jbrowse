define([
           'dojo/_base/declare',
           'dojo/dom-class',
           'dojo/dom-construct',

           'dijit/layout/ContentPane',

           'JBrowse/Util',
           'JBrowse/_ConfigurationMixin',
           'JBrowse/Util/_PromiseOwnerMixin'
       ],
       function(
           declare,
           domClass,
           dom,

           ContentPane,

           Util,
           _ConfigurationMixin,
           _PromiseOwnerMixin
       ) {

return declare( [
                    ContentPane,
                    _ConfigurationMixin,
                    _PromiseOwnerMixin
                ],
    {

  region: 'top',
  baseClass: 'trackView',
  //splitter: true,
  gutters: false,

  configSchema: {
      slots: [
          { name: 'description', type: 'string', defaultValue: '',
            description: 'text displayed next to the track title when this view is active'
          }
      ]
  },

  constructor: function(args) {
      Util.validate( args, { renderer: 'object'} );
  },

  startup: function() {
      this.inherited(arguments);
      this.get('renderer').startup();
  },
  postCreate: function() {
      this.inherited(arguments);
      this.get('renderer').postCreate();
  },
  buildRendering: function() {
      this.inherited(arguments);
      if( this.trackCSSClass )
          domClass.add( this.domNode, this.baseClass+'-'+this.trackCSSClass );
      this.get('renderer').buildRendering();
  },

  // a track view can have its own store, or it can use the store
  // associated with its track object
  _getStoreAttr: function() {
      return this.store || this.get('track').get('store');
  },

  heightUpdate: function( h ) {
      //console.log('heightUpdate %d',h);
      if( this.h != h ) {
          this.getParent().heightUpdate( this, h );
          this.h = h;
          this.domNode.style.height = h+'px';
      }
  },

  // show/hide track-wide message
  removeTrackMessage: function() {
      if( this.trackMessage )
          dom.destroy( this.trackMessage.node );
      delete this.trackMessage;
  },
  showTrackMessage: function( message ) {
      if( this.trackMessage && this.trackMessage.message == message )
          return;
      this.removeTrackMessage();
      this.trackMessage = {
          message: message,
          node: dom.create('div', { className: 'message', innerHTML: message }, this.domNode )
      };
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
  },

  destroy: function() {
      //console.log( 'destroying track view '+this.get('name') );
      this.cancelPromises('owner object destroyed');
      this.inherited(arguments);
  }

});
});
