define([
           'dojo/_base/declare',

           'dijit/form/_FormValueWidget',

           'JBrowse/Model/Resource'
       ],
       function(
           declare,

           _FormValueWidget,

           ResourceBase
       ) {

return declare( _FormValueWidget, {

  templateString: '<label data-dojo-attach-point="focusNode">Filename <input data-dojo-type="dojo/form/TextBox" data-dojo-attach-point="filenameNode" data-dojo-attach-event="onchange:_setValueAttr" name="filename"></label>',


  getResource: function() {
       return new ResourceBase(
           { transport: this.transport,
             resource: 'file://'+this.filenameNode.value
           });
  }

});
});