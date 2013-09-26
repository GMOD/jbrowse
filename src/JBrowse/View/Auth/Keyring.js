define([
           'dijit/form/DropDownButton',
           'dijit/DropDownMenu',
           'dijit/MenuItem'
       ],
       function(
           dijitDropDownButton,
           dijitDropDownMenu,
           dijitMenuItem
       ) {

return {
  makeKeyringControl: function( browser ) {
      var keyringMenu = new dijitDropDownMenu({
          leftClickToOpen: true
      });
      keyringMenu.addChild( new dijitMenuItem({ label: 'toast' }) );

      // make the share link
      var button = new dijitDropDownButton({
            className: 'menuBarControl keyring',
            innerHTML: '<span class="icon"></span> Keyring',
            title: 'manage authentication credentials',
            dropDown: keyringMenu
         });

      return { button: button, pane: keyringMenu };
  }
};

});