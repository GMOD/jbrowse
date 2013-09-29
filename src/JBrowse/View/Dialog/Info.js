define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dijit/focus',
           'JBrowse/View/Dialog/WithActionBar',
           'dojo/on',
           'dijit/form/Button'
       ],
       function(
           declare,
           array,
           lang,
           focus,
           ActionBarDialog,
           on,
           dijitButton
       ) {

return declare( ActionBarDialog,

    /**
     * JBrowse ActionDialog subclass with a few customizations that make it
     * more pleasant for use as an information popup.
     * @lends JBrowse.View.InfoDialog
     */
{
    refocus: false,
    autofocus: false,

    _fillActionBar: function( actionBar ) {
            new dijitButton({
                className: 'OK',
                label: 'OK',
                onClick: lang.hitch(this,'hide')
            })
            .placeAt( actionBar);
    },

    show: function() {

        this.inherited( arguments );

        var thisB = this;

        // make it so that clicking outside the dialog (on the underlay) will close it
        var underlay = ((dijit||{})._underlay||{}).domNode;
        if( underlay ) {
            this.own(
                on( underlay, 'click', lang.hitch( this, 'hideIfVisible' ))
            );
        }

        // also make ESCAPE or ENTER close the dialog box
        this.own(
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
        window.setTimeout( lang.hitch( this, 'destroyRecursive' ), 1000 );
    }

});
});