define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-construct',
           'dojo/dom-class',
           'dojo/query',
           'dojo/NodeList-dom',
           'dojo/NodeList-manipulate',
           'dojo/on',

           'dijit/Destroyable',
	   "dijit/_WidgetBase",
	   "dijit/_Container",
           "dijit/_Contained",
	   "dijit/_TemplatedMixin",
	   "dijit/_CssStateMixin",
	   "dijit/form/_ListMouseMixin",
           'dijit/form/DropDownButton',

           'JBrowse/Component',
           'JBrowse/Util',
           'JBrowse/Errors',
           'JBrowse/View/Dialog/Error'
       ],
       function(
           declare,
           lang,
           array,
           dom,
           cssClass,
           query,
           nodelistDom,
           nodelistManipulate,
           on,

           Destroyable,
           _WidgetBase,
           _Container,
           _Contained,
           _TemplatedMixin,
           _CssStateMixin,
           _ListMouseMixin,
           dijitDropDownButton,

           JBrowseComponent,
           Util,
           Errors,
           ErrorDialog
       ) {

var KeyringCredentialWidget = declare( [_WidgetBase, _TemplatedMixin, _Contained, _CssStateMixin],  {

    templateString: (''
                     + '<div class="credentialStatus" data-dojo-attach-point="containerNode">'
                       + '<div class="icon" data-dojo-attach-point="iconNode"></div>'
                       + '<div class="label" data-dojo-attach-point="labelNode"></div>'
                       + '<div class="status" data-dojo-attach-point="statusNode"></div>'
                       + '<div class="slotName" data-dojo-attach-point="slotNameNode"></div>'
                       + '<div class="message" data-dojo-attach-point="messageNode"></div>'
                       + '<div class="error" data-dojo-attach-point="errorNode"></div>'
                       + '<div class="releaseButton" data-dojo-type="dijit/form/Button" data-dojo-attach-event="onclick:releaseCredentials" data-dojo-attach-point="releaseButtonNode">X</div>'
                     + '</div>'),

    buildRendering: function() {
        this.inherited(arguments);
        cssClass.add( this.containerNode, this.credentialSlot.getConf('keyringCSSClass') );
        this.slotNameNode.innerHTML = this.credentialSlot.getConf('name');

        var thisB = this;
        this.watch( 'credentialSlot', function() {
                        thisB.updateCredentialState();
                    });
        this.watch('credentialReady', function() {
                       thisB._onCredentialReadyChange();
                   });
        this.watch('credentialError', function() {
                       thisB._onCredentialErrorChange();
                   });

        this.updateCredentialState( null, true );
        this._onCredentialReadyChange();
        this._onCredentialErrorChange();
    },

    getCredentials: function() {
        return this._doCredentialOp( 'get' );
    },
    releaseCredentials: function() {
        return this._doCredentialOp( 'release' );
    },
    _doCredentialOp: function( opname ) {
        if( this.credentialSlot ) {
            var thisB = this;
            return this.credentialSlot[opname]()
               .then( function() { thisB.updateCredentialState(); },
                      function(e) { thisB.updateCredentialState(e); }
                    );
        }
        return undefined;
    },

    updateCredentialState: function( credentialError, suppressEvent ) {
        var credential = this.credentialSlot;
        this.set( 'credentialReady', credential.isReady() );
        this.set( 'credentialError', credentialError );
    },

    _onCredentialErrorChange: function() {
        var credentialError = this.get('credentialError');
        if( credentialError && !( credentialError instanceof Errors.UserCancel )) {
            cssClass.add( this.containerNode, 'credentialError' );
            this.errorNode.innerHTML = ''+credentialError;
            this.errorNode.title = ''+credentialError;
            new ErrorDialog({ description: ''+credentialError, diagnosticMessage: ''+credentialError }).show();
        }
        else {
            this.errorNode.innerHTML = ' ';
            this.errorNode.title = ' ';
            cssClass.remove( this.containerNode, 'credentialError' );
        }
    },

    _onCredentialReadyChange: function() {
        var credential = this.get('credentialSlot');
        var isReady = this.get('credentialReady');
        var thisB = this;

        if( isReady ) {
            cssClass.replace( this.containerNode, 'credentialReady', 'credentialNotReady' );
        }
        else {
            cssClass.replace( this.containerNode, 'credentialNotReady', 'credentialReady' );
        }

        if( isReady ) {
            credential.getLabel()
                .then( function(label) {
                           thisB.labelNode.innerHTML = label;
                       });
        } else {
            this.labelNode.innerHTML = ' ';
        }

        if( isReady ) {
            this.statusNode.innerHTML = credential.getConf('readyStatusLabel');
            array.forEach( this.loginClicks, function(c) { c.remove(); } );
            this.loginClicks = [];
        } else {
            this.statusNode.innerHTML = credential.getConf('notReadyStatusLabel');
            var getcreds = lang.hitch( this, 'getCredentials' );
            this.loginClicks = array.map(
                [ this.statusNode, this.iconNode ],
                function() {
                    var h =  on(this.statusNode, 'click', getcreds );
                    this.own( h );
                    return h;
                }, this );
        }
    }

});

var KeyringPane = declare([ _WidgetBase, _TemplatedMixin, _Container ], {

    baseClass: "keyringPane",
    credentialSlots: [],
    peekDuration: 2000,

    templateString: (''
                     + '<div class="dijitReset" data-dojo-attach-point="containerNode">'
                     + '</div>'),

    buildRendering: function() {
        this.inherited( arguments );
        var thisB = this;
        array.forEach( this.credentialSlots, function(credential) {
                           var credentialWidget = new KeyringCredentialWidget({ credentialSlot: credential });
                           thisB.addChild( credentialWidget );
                           credentialWidget.watch('credentialReady', function() { thisB.peek(); } );
                       });
    },

    // open the pane for a short time to show changes, then close it
    // again
    peek: function() {
        var button = this.get('button');

        if( !button || button.get('_opened') )
            return;

        if( button.openDropDown ) {
            button.openDropDown();
            window.setTimeout( function() { button.closeDropDown(); }, this.get('peekDuration') );
        }
    },

    destroy: function() {
        this.inherited(arguments);
        delete this.button;
    }
});

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