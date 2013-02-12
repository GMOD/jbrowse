define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dijit/focus',
           'dijit/Dialog',
           'dojo/on',
           'dijit/form/Button'
       ],
       function( declare, array, focus, dijitDialog, on, dijitButton ) {

return declare( dijitDialog,

    /**
     * Dijit Dialog subclass with a few customizations that make it
     * more pleasant for use as an information popup.
     * @lends JBrowse.View.InfoDialog
     */
{
    refocus: false,
    autofocus: false,

    onLoad: function() {
        this.inherited(arguments);
        this._addActionBar();
    },

    _addActionBar: function() {
        if( this.get('content') && ! this.actionBar ) {
            this.actionBar = dojo.create( 'div', { className: 'infoDialogActionBar dijitDialogPaneActionBar' });

            new dijitButton({
                className: 'OK',
                label: 'OK',
                onClick: dojo.hitch(this,'hide'),
                focus: false
            })
            .placeAt( this.actionBar);

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
    },

    show: function() {
        this.inherited( arguments );

        var thisB = this;

        // holds the handles for the extra events we are registering
        // so we can clean them up in the hide() method
        this._extraEvents = [];

        // make it so that clicking outside the dialog (on the underlay) will close it
        var underlay = ((dijit||{})._underlay||{}).domNode;
        if( underlay ) {
            this._extraEvents.push(
                on( underlay, 'click', dojo.hitch( this, 'hideIfVisible' ))
            );
        }

        // also make ESCAPE or ENTER close the dialog box
        this._extraEvents.push(
            on( document.body, 'keydown', function( evt ) {
                    if( [ dojo.keys.ESCAPE, dojo.keys.ENTER ].indexOf( evt.keyCode ) >= 0 )
                        thisB.hideIfVisible();
                })
        );

        focus.focus( this.closeButtonNode );
    },

    hideIfVisible: function() {
        if( this.get('open') )
            this.hide();
    },

    hide: function() {
        this.inherited(arguments);

        array.forEach( this._extraEvents, function( e ) {
                          e.remove();
                      });
    }

});
});