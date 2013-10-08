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
      var msg = this.diagnosticMessage || ( this.error && (this.error.stack || ''+this.error) );
      this.set( 'content', '<div class="error"><h2>Oops!</h2><div class="text">There was a problem'+(this.activity? ' '+this.activity : '')+'.</div>'
                +( msg ? '<div class="codecaption">Diagnostic message</div><code><pre>'+msg+'</pre></code>' : '' )
                +'</div>'
              );

      this.inherited(arguments);
  }

});
});
