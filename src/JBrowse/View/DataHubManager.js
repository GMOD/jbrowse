define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/fx',
           'dojo/dom-construct',
           'dojo/dom-geometry',
           'dojo/promise/all',
           'dojo/on',

           'dijit/form/Button',
           'dijit/layout/BorderContainer',
           'dijit/layout/ContentPane',

           'JBrowse/Util',
           './DataHubManager/DataHub',
           './DataHubManager/AddHubDialog'
       ],
       function(
           declare,
           array,
           fx,
           domConstruct,
           geom,
           all,
           on,

           Button,
           BorderContainer,
           ContentPane,

           Util,
           DataHubView,
           AddHubDialog
       ) {

return declare( 'JBrowse/View/DataHubManager', BorderContainer, {

baseClass: 'dataHubManager',
gutters: false,

constructor: function( args ) {
    Util.validate( args, { app: 'object' });
},

buildRendering: function() {
    this.inherited(arguments);

    var thisB = this;
    this.addChild( this.headerPane        = this._renderHeader() );
    this.addChild( this.availableHubsPane = this._renderAvailableHubsPane() );
    this.addChild( this.currentHubPane    = this._renderCurrentHubPane() );

    // add the current hub to the current pane
    this._updateCurrentHubPane();
},

// placeAt plus a fade-in animation
fadeInAt: function() {
    this.placeAt.apply( this, arguments );
    this.domNode.style.opacity = 0;
    fx.fadeIn({ node: this.domNode, duration: 200 }).play();
    return this;
},

_renderAvailableHubsPane: function() {
    var thisB = this;
    this.availableHubsContentNode = domConstruct.create( 'div',{ className: 'content' } );
    var pane = new ContentPane(
        { baseClass: 'availableHubs',
          splitter: true,
          region: 'top',
          style: 'height: 55%',
          content: [
              domConstruct.create('h2', { innerHTML: 'Available hubs' } ),
              this.availableHubsContentNode
          ]
        });

    // add all the available hubs to the available pane
    var hubnames = this.get('app').listAvailableDataHubs();
    all( array.map( hubnames, function( n ) { return thisB.get('app').getDataHub( n ); } ) )
        .then( function( hubs ) {
                   array.forEach( hubs, thisB._addAvailableHub, thisB );
               });

    return pane;
},

_renderCurrentHubPane: function() {
    this.currentHubContentNode = domConstruct.create( 'div',{ className: 'content' } );
    var pane = new ContentPane(
        { baseClass: 'currentHub',
          splitter: true,
          region: 'center',
          style: 'height: 40%',
          content: [
              domConstruct.create('h2', { innerHTML: 'Current hub' } ),
              this.currentHubContentNode
          ]
        });

    return pane;
},

// updates which hub is displayed in the Current Hub pane
_updateCurrentHubPane: function() {
    var thisB = this;
    this.get('app').getDisplayedDataHub()
        .then( function( hub ) {
            array.forEach( thisB.currentHubPane.getChildren(),
                           function( child ) {
                               child.destroyRecursive();
                               thisB.currentHubPane.removeChild( child );
                           });
            if( hub ) {
                new DataHubView({ dataHub: hub }).placeAt( thisB.currentHubContentNode );
            }
            else {
                thisB.currentHubContentNode.innerHTML = 'No hub currently displayed';
            }
    });
},

// prompts the user to open a new hub by browsing, searching, or
// typing a URL, then opens it
_addHubFromPrompt: function() {
    var thisB = this;
    return new AddHubDialog({ browser: thisB.get('app') })
        .prompt()
        .then( function( data ) {
                   return thisB.get('app').addDataHub({ url: data.url })
                       .then( function( hub ) {
                                  return thisB._addAvailableHub( hub )
                                      .then( function() {
                                                 if( data.switchTo )
                                                     thisB.get('app')
                                                     .setConf('hubUrl', hub.getConf('url') );
                                             });
                              });
               });
},

_renderHeader: function() {
    var thisB = this;
    var pane = new ContentPane(
        { baseClass: 'header',
          region: 'top',
          content: '<span class="title">Data hubs</span>'
        });
    pane.addChild( new Button(
                       { label: 'Add hub',
                         className: 'addHubButton',
                         onClick: function() {
                             thisB._addHubFromPrompt();
                         },
                         iconClass: 'jbrowseIconAdd'
                       }));
    var closeButton = domConstruct.create( 'div', { className: 'closeButton' }, pane.domNode );
    on( closeButton, 'click', function() {
            if( thisB.getParent() )
                thisB.getParent().removeChild( thisB );

            fx.fadeOut(
                {
                    node: thisB.domNode,
                    duration: 200,
                    onEnd: function() {
                        thisB.destroyRecursive();
                    }
                }).play();
    });
    return pane;
},

_addAvailableHub: function( hub ) {
    new DataHubView(
        { dataHub: hub })
        .placeAt( this.availableHubsContentNode );
},

showOver: function( el ) {
    var pos = geom.position( el );
    this.placeAt(
        domConstruct.create(
            'div', {
                style: {
                    width: pos.w+'px',
                    height: pos.h+'px',
                    top: pos.y+'px',
                    left: pos.x+'px',
                    position: 'fixed'
                }
            }, document.body )
    );
}

});
});