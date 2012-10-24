define([
           'dojo/_base/declare',
           'dijit/Dialog',
           'dojo/on'
       ],
       function( declare, dijitDialog, on ) {

return declare( dijitDialog,

    /**
     * Dijit Dialog subclass with a few customizations that make it
     * more pleasant for use as an information popup.
     * @lends JBrowse.View.InfoDialog
     */
{



    show: function() {
        this.inherited( arguments );

        var dialog = this;

        // make it so that clicking outside the dialog (on the underlay) will close it
        var underlay = ((dijit||{})._underlay||{}).domNode;
        if( underlay ) {
            var ulClick = on( underlay, 'click', function() {
                if( dialog.get('open') ) {
                    ulClick.remove();
                    dialog.hide();
                }
            });
        }


        var escapePress = on( document.body, 'keypress', function() {
                if( dialog.get('open') ) {
                    escapePress.remove();
                    dialog.hide();
                }
        });
    }

});
});