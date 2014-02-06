define([
           'dojo/_base/declare',
           'dojo/dom-construct',
           'dijit/focus',
            'dijit/form/NumberSpinner',
           'JBrowse/View/Dialog/WithActionBar',
           'dojo/on',
           'dijit/form/Button',
           'JBrowse/Model/Location'
       ],
       function( declare, dom, focus, NumberSpinner, ActionBarDialog, on, Button, Location ) {


return declare( ActionBarDialog, {
    /**
     * Dijit Dialog subclass that pops up prompt for the user to
     * manually set a new highlight.
     * @lends JBrowse.View.InfoDialog
     */
    autofocus: false,
    title: 'Set track height',

    constructor: function( args ) {
        this.height = args.height || 100;
        this.browser = args.browser;
        this.setCallback    = args.setCallback || function() {};
        this.cancelCallback = args.cancelCallback || function() {};
        this.heightConstraints = { min: 50, max: 750 };
    },

    _fillActionBar: function( actionBar ) {
        var ok_button = new Button({
            label: "OK",
            onClick: dojo.hitch(this, function() {
                var height = parseInt(this.heightSpinner.getValue());
                if (isNaN(height) || height < this.heightConstraints.min
                    || height > this.heightConstraints.max) return;


                console.log(height);
                this.setCallback && this.setCallback( height );
                this.hide();
            })
        }).placeAt(actionBar);

        var cancel_button = new Button({
            label: "Cancel",
            onClick: dojo.hitch(this, function() {
                this.cancelCallback && this.cancelCallback();
                this.hide();
            })
        }).placeAt(actionBar);
    },

    show: function( callback ) {
        dojo.addClass( this.domNode, 'setTrackHeightDialog' );

        this.heightSpinner = new NumberSpinner({
            value: this.height,
            smallDelta: 10,
            constraints: this.heightConstraints
        });

        this.set('content', [
                     dom.create('label', { "for": 'newhighlight_locstring', innerHTML: '' } ),
                     this.heightSpinner.domNode
                 ] );

        this.inherited( arguments );
    },

    hide: function() {
        this.inherited(arguments);
        window.setTimeout( dojo.hitch( this, 'destroyRecursive' ), 500 );
    }
});
});
