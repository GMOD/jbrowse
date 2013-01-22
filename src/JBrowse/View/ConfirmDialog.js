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
     * Dijit Dialog subclass that pops up a yes/no confirmation
     * more pleasant for use as an information popup.
     * @lends JBrowse.View.InfoDialog
     */
{
    autofocus: false,

    constructor: function( args ) {

        this.message = args.message || 'Do you really want to do this?';
        this.confirmLabel = args.confirmLabel || 'Yes';
        this.denyLabel    = args.denyLabel    || 'No';

        dojo.connect( this, 'onLoad', this, '_addActionBar' );
    },

    _addActionBar: function() {
        var that = this;
        if( this.get('content') && ! this.actionBar ) {
            this.actionBar = dojo.create( 'div', { className: 'infoDialogActionBar dijitDialogPaneActionBar' });

            new dijitButton({ className: 'yes',
                              label: this.confirmLabel,
                              onClick: function() {
                                  that.callback( true );
                                  that.hide();
                              }
                            })
                .placeAt( this.actionBar);
            new dijitButton({ className: 'no',
                              label: this.denyLabel,
                              onClick: function() {
                                  that.callback( false );
                                  that.hide();
                              }
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


    show: function( callback ) {
        this.callback = callback || function() {};

        this.set('content', this.message );

        this._addActionBar();

        this.inherited( arguments );

        focus.focus( this.closeButtonNode );
    }

});
});