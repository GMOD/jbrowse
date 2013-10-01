/**
 * GUI control for managing a single credential slot.  Typically shown
 * in the JBrowse Keyring pane.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/event',
           'dojo/dom-construct',
           'dojo/dom-class',
           'dojo/on',
           'dojo/aspect',

	   "dijit/_WidgetBase",
           "dijit/_Contained",
	   "dijit/_TemplatedMixin",
	   "dijit/_CssStateMixin",

           'JBrowse/Errors',
           'JBrowse/View/Dialog/Error'
       ],
       function(
           declare,
           array,
           event,
           domConstruct,
           cssClass,
           on,
           aspect,

           _WidgetBase,
           _Contained,
           _TemplatedMixin,
           _CssStateMixin,

           Errors,
           ErrorDialog
       ) {

return declare( [_WidgetBase, _TemplatedMixin, _Contained, _CssStateMixin],  {

    templateString: (''
                     + '<div class="credentialStatus" data-dojo-attach-point="containerNode">'
                       + '<div class="picture" data-dojo-attach-point="pictureNode"></div>'
                       + '<div class="label" data-dojo-attach-point="labelNode"></div>'
                       + '<div class="status" data-dojo-attach-point="statusNode"></div>'
                       + '<div class="slotType" data-dojo-attach-point="slotTypeNode">'
                       + '   <div class="slotIcon" data-dojo-attach-point="slotIconNode"></div>'
                       + '   <span class="slotName" data-dojo-attach-point="slotNameNode"></span>'
                       + '</div>'
                       + '<div class="message" data-dojo-attach-point="messageNode"></div>'
                       + '<div class="error" data-dojo-attach-point="errorNode"></div>'
                       + '<div class="releaseButton"'
                       + '     data-dojo-type="dijit/form/Button"'
                       + '     data-dojo-attach-event="onclick:releaseCredentials"' //< note the onclick
                       + '     data-dojo-attach-point="releaseButtonNode">X</div>'
                     + '</div>'),

    buildRendering: function() {
        this.inherited(arguments);
        cssClass.add( this.containerNode, this.credentialSlot.getConf('keyringCSSClass') );
        this.slotNameNode.innerHTML = this.credentialSlot.getConf('name');

        var thisB = this;

        this.watch( 'credentialSlot', function() {
                        thisB._watchCredentialSlot();
                        thisB.updateCredentialState();
                    });
        this.watch('credentialReady', function() {
                       thisB._onCredentialReadyChange();
                       thisB.getParent().peek();
                   });
        this.watch('credentialError', function() {
                       thisB._onCredentialErrorChange();
                       thisB.getParent().peek();
                   });

        this.updateCredentialState( null, true );
        this._watchCredentialSlot();
        this._onCredentialReadyChange();
        this._onCredentialErrorChange();
    },

    // watch out credentialslot for any changes
    _watchCredentialSlot: function() {
        var thisB = this;
        aspect.after( this.credentialSlot, 'gotCredentials', function() {
                          thisB.updateCredentialState();
                      });
        aspect.after( this.credentialSlot, 'gotCredentialError', function(error) {
                          thisB.updateCredentialState(error);
                      });
    },

    getCredentials: function() {
        return this._doCredentialOp( 'get' );
    },
    releaseCredentials: function(evt) {
        if( evt && evt.target )
            event.stop( evt );

        return this._doCredentialOp( 'release' );
    },
    _doCredentialOp: function( opname ) {
        if( this.credentialSlot ) {
            var thisB = this;
            return this.credentialSlot[opname]({ interactive: true })
               .then( function() { thisB.updateCredentialState(); },
                      function(e) { thisB.updateCredentialState(e); throw e; }
                    );
        }
        return undefined;
    },

    updateCredentialState: function( credentialError ) {
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
            new ErrorDialog({ description: ''+credentialError, diagnosticMessage: credentialError.stack || ''+credentialError }).show();
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

        // picture
        if( isReady ) {
            credential.getUserInfo()
            .then( function( userinfo ) {
                       var pictureUrl = userinfo.picture || userinfo.avatar || userinfo.image;
                       if( pictureUrl )
                           domConstruct.create(
                               'img', {
                                   src: pictureUrl,
                                   style: 'width: 100%; height: 100%; display: block'
                               }, thisB.pictureNode );
                   });
        } else {
            domConstruct.empty( this.pictureNode );
        }


        if( isReady ) {
            this.statusNode.innerHTML = credential.getConf('readyStatusLabel');
            array.forEach( this.loginClicks, function(c) { c.remove(); } );
            this.loginClicks = [];
        } else {
            this.statusNode.innerHTML = credential.getConf('notReadyStatusLabel');
            this.loginClicks = array.map(
                [ this.containerNode ],
                function(node) {
                    var h =  on( node, 'click', function(evt) {
                                     thisB.getCredentials();
                                     event.stop( evt );
                                 });
                    this.own( h );
                    return h;
                }, this );
        }
    }

});
});