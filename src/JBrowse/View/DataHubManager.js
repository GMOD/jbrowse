define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/dom-construct',
           'dojo/dom-geometry',
           'dojo/promise/all',
           'dojo/on',

           'dijit/layout/BorderContainer',
           'dijit/TitlePane',
           'dijit/layout/ContentPane',

           './DataHubManager/DataHub'
       ],
       function(
           declare,
           array,
           domConstruct,
           geom,
           all,
           on,

           BorderContainer,
           TitlePane,
           ContentPane,

           DataHubView
       ) {

return declare( 'JBrowse/View/DataHubManager', BorderContainer, {

baseClass: 'dataHubManager',
gutters: false,

buildRendering: function() {
    this.inherited(arguments);

    var thisB = this;
    this.addChild( this.headerPane        = this._renderHeader() );
    this.addChild( this.availableHubsPane = this._renderAvailableHubsPane() );
    this.addChild( this.currentHubPane    = this._renderCurrentHubPane() );

    // add the current hub to the current pane
    this._updateCurrentHubPane();
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

_renderHeader: function() {
    var thisB = this;
    var pane = new ContentPane(
        { baseClass: 'header',
          region: 'top',
          content: '<span class="title">Manage data hubs</span>'
        });
    var closeButton = domConstruct.create( 'div', { className: 'closeButton' }, pane.domNode );
    on( closeButton, 'click', function() {
            if( thisB.getParent() )
                thisB.getParent().removeChild( thisB );
            thisB.destroyRecursive();
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