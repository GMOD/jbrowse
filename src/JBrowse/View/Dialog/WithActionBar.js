/**
 * A dialog with an action bar at the bottom for buttons.
 */
define([
           'dojo/_base/declare',
           'dijit/Dialog'
       ],
       function( declare, dijitDialog ) {

return declare( dijitDialog,
{
    constructor: function() {
        dojo.connect( this, 'onLoad', this, '_addActionBar' );
    },

    _addActionBar: function() {
        var that = this;
        if( this.get('content') && ! this.actionBar ) {
            this.actionBar = dojo.create( 'div', { className: 'infoDialogActionBar dijitDialogPaneActionBar' });

            this._fillActionBar( this.actionBar );

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

    _fillActionBar: function( actionBar ) {
    },

    show: function( callback ) {
        this._addActionBar();
        this.inherited( arguments );
    }

});
});