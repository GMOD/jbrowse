define([
           'dojo/_base/declare',
           'dojo/dom-construct',
           'dojo/dom-geometry',
           'dojo/aspect',
           'JBrowse/Auth/CredentialSlot'
       ],
       function(
           declare,
           dom,
           domGeom,
           aspect,
           CredentialSlot
       ) {

var serialNumber = 0;
return declare( CredentialSlot, {
  configSchema: {
      slots: [
          { name: 'loginURL', type: 'string' },
          { name: 'interactiveLogin', type: 'boolean', defaultValue: true }
          { name: 'logoutURL', type: 'string' },
          { name: 'interactiveLogout', type: 'boolean', defaultValue: false }
      ]
  },

  neededFor: function( resourceDefinition ) {
      throw new Error('override neededFor in a subclass');
  },

  _getCredentials: function() {
      var iframeDims = function() {
          var d = domGeom.position( this.browser.container );
          return { h: Math.round(d.h * 0.8), w: Math.round( d.w * 0.8 ) };
      }.call(this);

      var dialog = new Dialog({ });
      var iframe = dom.create('iframe', {
          src: this.getConf('loginURL')
      });
      dialog.set('content', loginFrame );

      var updateIframeSize = function() {
          // hitch a ride on the dialog box's
          // layout function, which is called on
          // initial display, and when the window
          // is resized, to keep the iframe
          // sized to fit exactly in it.
          var cDims = domGeom.position( dialog.containerNode );
          var width  = cDims.w;
          var height = cDims.h - domGeom.position(dialog.titleBar).h;
          iframe.width = width;
          iframe.height = height;
      };
      aspect.after( dialog, 'layout', updateIframeSize );
      aspect.after( dialog, 'show', updateIframeSize );
  },

  clear: function() {
  }

});
});