define([
           'dojo/_base/declare',
           'JBrowse/View/Dialog/Info'
       ],
       function(
           declare,
           InfoDialog
       ) {

return declare( InfoDialog, {

  baseClass: 'errorDialog',
  title: 'Error',

  show: function() {
      this.set( 'content', '<div class="error"><h2>Oops!</h2><div class="text">There was a problem'+(this.activity? ' '+this.activity : '')+'.</div>'
                +( this.diagnosticMessage ? '<div class="codecaption">Diagnostic message</div><code>'+this.diagnosticMessage+'</code>' : '' )
                +'</div>'
              );

      this.inherited(arguments);
  }

});
});
