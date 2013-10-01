define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/dom-class',

           'dijit/Destroyable',
	   "dijit/_WidgetBase",
	   "dijit/_Container",
	   "dijit/_TemplatedMixin",
	   "dijit/_CssStateMixin",
	   "dijit/form/_ListMouseMixin",
           'dijit/form/DropDownButton',

           'JBrowse/Component',
           'JBrowse/View/_FadingPopupMixin',
           './Keyring/CredentialWidget'
       ],
       function(
           declare,
           array,
           cssClass,

           Destroyable,
           _WidgetBase,
           _Container,
           _TemplatedMixin,
           _CssStateMixin,
           _ListMouseMixin,
           dijitDropDownButton,

           JBrowseComponent,
           _FadingPopupMixin,
           KeyringCredentialWidget
       ) {

/**
 * The keyring pane widget.
 */
var KeyringPane = declare([ _WidgetBase, _TemplatedMixin, _Container, _FadingPopupMixin ], {

    baseClass: "keyringPane",
    credentialSlots: [],
    peekDuration: 2000,

    templateString: (''
                     + '<div class="dijitReset" data-dojo-attach-point="containerNode">'
                       + '<div class="emptyMessage" data-dojo-attach-point="emptyMessageNode">none</div>'
                     + '</div>'),

    buildRendering: function() {
        this.inherited( arguments );
        var thisB = this;
        if( this.credentialSlots.length ) {
            cssClass.remove( this.containerNode, 'empty' );

            array.forEach( this.credentialSlots, function(credential) {
                               var credentialWidget = new KeyringCredentialWidget({ credentialSlot: credential });
                               thisB.addChild( credentialWidget );
                               credentialWidget.watch('credentialReady', function() { thisB.peek(); } );
                           });
        } else {
            cssClass.add( this.containerNode, 'empty' );
        }
    },

    // open the pane for a short time to show changes, then close it
    // again
    peek: function() {
        var button = this.get('button');

        if( !button || button.get('_opened') )
            return;

        if( button.openDropDown ) {
            try {
                button.openDropDown();
                window.setTimeout( function() { button.closeDropDown(); }, this.get('peekDuration') );
            } catch(e) {}
        }
    },

    destroy: function() {
        this.inherited(arguments);
        delete this.button;
    }
});

/**
 * Small JBrowse component that encapsulates the 'Keyring' dropdown
 * button, on which is attached the Keyring pane widget.
 */
return declare( [ JBrowseComponent, Destroyable ], {
  constructor: function( browser ) {
      this.button = new dijitDropDownButton({
            className: 'menuBarControl keyring',
            innerHTML: '<span class="icon"></span> Keyring',
            title: 'manage authentication credentials',
            dropDownClass: KeyringPane
         });

      this.buildMenu();
  },

  getButton: function() {
      return this.button;
  },

  buildMenu: function() {
      var thisB = this;
      return this.browser.getCredentialSlots()
          .then( function( credentials ) {
                     var pane = new KeyringPane({ button: thisB.button, credentialSlots: credentials });
                     thisB.button.set('dropDown', pane );
                 });
  },

  destroy: function() {
      this.button.destroyRecursive();
      delete this.button;
  }

});
});