/**
 * Base class for dialogs used in JBrowse.
 */
define([
           'dojo/_base/declare',

           'dijit/Dialog'
       ],
       function(
           declare,

           Dialog
       ) {

return declare( Dialog, {
  constructor: function( args ) {
      if( ! args.browser )
          throw new Error('browser argument required');
  },

  postCreate: function() {
      this.inherited(arguments);
      this.domNode.className += ' jbrowse '+this.browser.getConf('theme');
  }
});
});