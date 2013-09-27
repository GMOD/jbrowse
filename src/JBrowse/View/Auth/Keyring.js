define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/query',
           'dojo/NodeList-dom',
           'dojo/NodeList-manipulate',
           'dijit/Destroyable',
           'dijit/form/DropDownButton',
           'dijit/DropDownMenu',
           'dijit/MenuItem',
           'JBrowse/Component',
           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           array,
           query,
           nodelistDom,
           nodelistManipulate,
           Destroyable,
           dijitDropDownButton,
           dijitDropDownMenu,
           dijitMenuItem,
           JBrowseComponent,
           Util
       ) {

return declare( [ JBrowseComponent, Destroyable ], {
  constructor: function( browser ) {
      this.button = new dijitDropDownButton({
            className: 'menuBarControl keyring',
            innerHTML: '<span class="icon"></span> Keyring',
            title: 'manage authentication credentials'
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
                     var pane = new dijitDropDownMenu(
                         {
                             leftClickToOpen: true
                         });
                     array.forEach( credentials, function(credential) {
                                        pane.addChild( thisB._makeCredentialMenuItem( credential ) );
                                    });
                     thisB.button.set('dropDown', pane );
                 });
  },

  destroy: function() {
      this.button.destroyRecursive();
      delete this.button;
  },

  _makeCredentialMenuItem: function( credential ) {
      var thisB = this;
      var menuItem;

      function _update( credentialError, nonInteractive ) {
          var isReady = credential.isReady();
          menuItem.set(
              'label',
              Util.fillTemplate(
                  (''
                   + '<div class="credentialStatus {className}">'
                     + '<span class="icon"></span>'
                     + '<span class="name">{name}</span>'
                     + '<span class="actionLabel">Click to {actionLabel}</span>'
                     + '<span class="message"></span>'
                   + '</div>'
                  ),
                  { className: credential.getConf('keyringCSSClass'),
                    name: credential.getConf('name'),
                    actionLabel: credential.getConf( ( isReady ? 'release' : 'get' )+'ActionLabel')
                  })
          );
          menuItem.set( 'onClick', function() {
              credential[ isReady ? 'release' : 'get' ]
                                .call( credential )
                                .then( function(){ _update(); },
                                       function(error){ _update(error); }
                                     );
          });

          if( ! nonInteractive ) {
              query( '.credentialStatus .message', menuItem.domNode )
                  .addClass( 'active' )
                  .innerHTML( credential.getConf(
                                  (isReady?'get':'release')
                                  +( credentialError ? 'Failure' : 'Success' )
                                  +'Message'
                              ));
              thisB.button.openDropDown();
              window.setTimeout( function() {
                                     query( '.credentialStatus .message', menuItem.domNode )
                                         .removeClass('active')
                                         .empty();
                                     thisB.button.closeDropDown();
                                 }, 2000 );
          }
      }

      menuItem = new dijitMenuItem();
      _update( null, 'nonInteractive' );
      return menuItem;
  }
});
});