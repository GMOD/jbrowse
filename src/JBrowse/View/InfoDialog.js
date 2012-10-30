define([
           'dojo/_base/declare',
           'dijit/focus',
           'dijit/Dialog',
           'dojo/on',
           'dijit/form/Button'
       ],
       function( declare, focus, dijitDialog, on, dijitButton ) {

return declare( dijitDialog,

    /**
     * Dijit Dialog subclass with a few customizations that make it
     * more pleasant for use as an information popup.
     * @lends JBrowse.View.InfoDialog
     */
{
    autofocus: false,

    show: function() {
        if( ! this.actionBar ) {
            this.actionBar = dojo.create( 'div', { className: 'infoDialogActionBar dijitDialogPaneActionBar' });
            new dijitButton({ className: 'OK', label: 'OK', onClick: dojo.hitch(this,'hide') }).placeAt( this.actionBar);
            var c = this.get('content');
            var container = dojo.create( 'div', { className: 'infoDialogContent' });
            if( typeof c == 'string' )
                container.innerHTML = c;
            else {
                if( c.parentNode )
                        c.parentNode.removeChild( c );
                container.addChild( c );
            }
            this.set( 'content',
                      [
                          container,
                          this.actionBar
                      ]
                    );
        }

        this.inherited( arguments );

        focus.focus( this.closeButtonNode );

        var dialog = this;
        var underlay = ((dijit||{})._underlay||{}).domNode;

        this._extraEvents = [];

        // make it so that clicking outside the dialog (on the underlay) will close it
        if( underlay ) {
            this._extraEvents.push(
                on( underlay, 'click', dojo.hitch( this, 'hideIfVisible' ))
            );
        }

        // make ESCAPE or ENTER close the dialog box
        this._extraEvents.push(
            on( document.body, 'keydown', dojo.hitch( this, function( evt ) {
                    if( [ dojo.keys.ESCAPE, dojo.keys.ENTER ].indexOf( evt.keyCode ) >= 0 )
                        this.hideIfVisible();
                }))
        );
    },

    hideIfVisible: function() {
        if( this.get('open') )
            this.hide();
    },

    hide: function() {
        this.inherited(arguments);

        dojo.forEach( this._extraEvents || [], function( e ) {
                          e.remove();
                      });
    }

});
});