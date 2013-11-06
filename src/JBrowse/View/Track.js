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

return declare( [_WidgetBase,Component], {

  buildRendering: function() {
      this.inherited( arguments );
      this.domNode.innerHTML = 'hi im a track';
  },

});
});
