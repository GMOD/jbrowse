define([
           'dojo/_base/declare',
           'dojo/dom-construct',
           'dijit/focus',
           'dijit/form/TextBox',
           'JBrowse/View/Dialog/WithActionBar',
           'dojo/on',
           'dijit/form/Button',
           'JBrowse/Model/Location'
       ],
       function( declare, dom, focus, dijitTextBox, ActionBarDialog, on, Button, Location ) {


return declare( ActionBarDialog,

    /**
     * Dijit Dialog subclass that pops up prompt for the user to
     * manually set a new highlight.
     * @lends JBrowse.View.InfoDialog
     */
{
    autofocus: false,
    title: 'Set highlight',

    constructor: function( args ) {
        this.browser = args.browser;
        this.setCallback    = args.setCallback || function() {};
        this.cancelCallback = args.cancelCallback || function() {};
    },

    _fillActionBar: function( actionBar ) {
        var thisB = this;
        new Button({ iconClass: 'dijitIconDelete', label: 'Cancel',
                     onClick: function() {
                         thisB.cancelCallback && thisB.cancelCallback();
                         thisB.hide();
                     }
                   })
            .placeAt( actionBar );
        new Button({ iconClass: 'dijitIconFilter',
                     label: 'Highlight',
                     onClick:function() {
                         thisB.setCallback && thisB.setCallback( thisB.getLocation() );
                         thisB.hide();
                     }
                   })
            .placeAt( actionBar );
    },

    show: function( callback ) {
        var thisB = this;

        dojo.addClass( this.domNode, 'setHighlightDialog' );

        var visibleLocation = this.browser.view.visibleRegionLocString();
        if( visibleLocation )
            visibleLocation += ' (current view)';

        this.highlightInput = new dijitTextBox({
            id: 'newhighlight_locstring',
            value: (this.browser.getHighlight()||'').toString() || visibleLocation || '',
            placeHolder: visibleLocation || 'ctgA:1234..5678'
        });

        this.set('content', [
                     dom.create('label', { "for": 'newhighlight_locstring', innerHTML: 'Location' } ),
                     this.highlightInput.domNode
                 ] );

        this.inherited( arguments );
    },

    getLocation: function() {
        // have to use onChange to get the value of the text box to work around a bug in dijit
        return new Location( this.highlightInput.get('value') );
    },

    hide: function() {
        this.inherited(arguments);
        window.setTimeout( dojo.hitch( this, 'destroyRecursive' ), 500 );
    }
});
});