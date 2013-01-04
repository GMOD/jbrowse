define([
           'dojo/_base/declare',
           'dojo/dom-construct',
           'dojo/aspect',
           'dijit/Dialog',
           'dijit/focus',
           'JBrowse/View/LocationList'
       ],
       function(
           declare,
           dom,
           aspect,
           Dialog,
           dijitFocus,
           LocationListView
       ) {
return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser;
        this.config = dojo.clone( args.config || {} );
        this.locationChoices = args.locationChoices;
        this.title = args.title || 'Choose location';
        this.description = args.description;
    },

    show: function() {
        var dialog = this.dialog = new Dialog(
            { title: this.title,
              className: 'locationChoiceDialog'
            }
            );
        var container = dom.create('div',{});

        // show the description if there is one
        if( this.description ) {
            dom.create('div', {
                           className: 'description',
                           innerHTML: this.description
                       }, container );
        }

        var browser = this.browser;
        this.locationListView = new LocationListView(
            { browser: browser,
              locations: this.locationChoices,
              goCallback:   function( location ) { dialog.hide(); browser.showRegion( location ); },
              showCallback: function( location ) { browser.showRegion( location ); }
            },
            dom.create( 'div', { className: 'locationList' }, container )
        );

        dialog.set( 'content', container );
        dialog.show();
        aspect.after( dialog, 'hide', dojo.hitch( this, function() {
                              dijitFocus.curNode && dijitFocus.curNode.blur();
                              dialog.destroyRecursive();
                      }));
    }
});
});