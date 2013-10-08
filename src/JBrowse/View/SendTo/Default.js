define([
           'dojo/_base/declare',

           'dijit/form/_FormValueWidget',
           'dijit/_WidgetsInTemplateMixin',

           'JBrowse/Model/Resource'
       ],
       function(
           declare,

           _FormValueWidget,
           _WidgetsInTemplateMixin,

           ResourceBase
       ) {

return declare( [_FormValueWidget, _WidgetsInTemplateMixin], {

  templateString: '<label data-dojo-attach-point="focusNode">Filename <input data-dojo-type="dijit/form/TextBox" data-dojo-attach-point="filenameBox" data-dojo-attach-event="onchange:_setValueAttr,onkeypress:_setUserModified" size="70" name="filename"></label>',

  update: function( args ) {
      this.mediaType = args.mediaType;
      var fileExtension = args.mediaType && args.mediaType.fileExtensions[0];
      var filename = ( args.basename || 'data' ) + ( fileExtension ? '.'+fileExtension : '' );
      if( ! this._userModified ) // don't overwrite the filename if the user has edited it
          this.filenameBox.set( 'value', filename.replace(/[\/\\]+/g,'_') );
  },

  _setUserModified: function() {
      this._userModified = true;
  },

  getResource: function() {
       return new ResourceBase(
           { transport: this.transport,
             resource: 'file://'+this.filenameBox.get('value'),
             filename: this.filenameBox.get('value'),
             mediaType: this.mediaType
           });
  }

});
});