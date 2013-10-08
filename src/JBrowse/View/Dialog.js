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
  postCreate: function() {
      this.inherited(arguments);
      this.domNode.className += ' jbrowse '+this.browser.getConf('theme');
  }
});
});