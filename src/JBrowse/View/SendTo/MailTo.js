define([
           'dojo/_base/declare',

           'JBrowse/Model/Resource',
           './Default'
       ],
       function(
           declare,

           ResourceBase,
           _Default
       ) {

return declare( _Default, {

  templateString: '<div class="default" data-dojo-attach-point="containerNode">'
                    
                  + '<label data-dojo-attach-point="focusNode">'
                  +   '<span class="text">To</span> '
                  +   '<input data-dojo-type="dijit/form/TextBox"'
                        + ' data-dojo-attach-point="toBox"'
                        + ' data-dojo-attach-event="onkeypress:_setUserModified"'
                        + ' name="to" />'
                  + '</label>'

                  + '<label>'
                  +   '<span class="text">Filename</span> '
                  +   '<input data-dojo-type="dijit/form/TextBox"'
                        + ' data-dojo-attach-point="filenameBox"'
                        + ' data-dojo-attach-event="onkeypress:_setUserModified"'
                        + ' name="filename" />'
                  + '</label>'

                + '</div>',

  getResource: function() {
       return new ResourceBase(
           { transport: this.transport,
             resource: 'mailto:'+escape(this.toBox.get('value')),
             filename: this.filenameBox.get('value'),
             mediaType: this.mediaType
           });
  }

});
});