define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/dom-construct',
           'dojo/dom-geometry',
           'dojo/promise/all',

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
    this.addChild( this.availableHubsPane = new ContentPane(
        { baseClass: 'availableHubs', splitter: true, region: 'top',    content: '<h2>Available hubs</h2>' }) );
    this.addChild( this.currentHubPane    = new ContentPane(
        { baseClass: 'currentHub', splitter: true, region: 'center', content: '<h2>Current hub</h2>' }) );

    // add all the available hubs to the available pane
    var hubnames = this.get('app').listAvailableDataHubs();
    all( array.map( hubnames, function( n ) { return thisB.get('app').getDataHub( n ); } ) )
        .then( function( hubs ) {
                   array.forEach( hubs, thisB._addAvailableHub, thisB );
               });

    // add the current hub to the current pane
    thisB._updateCurrentHubPane();
},

// updates which hub is displayed in the Current Hub pane
_updateCurrentHubPane: function() {
    var thisB = this;
    this.get('app').getDisplayedDataHub().then( function( hub ) {
        array.forEach( thisB.currentHubPane.getChildren(),
                       function( child ) {
                           child.destroyRecursive();
                           thisB.currentHubPane.removeChild( child );
                       });
        if( hub ) {
            thisB.currentHubPane.addChild( new DataHubView({ dataHub: hub }) );
        }
        else {
            thisB.currentHubPane.set( 'content', 'No hub currently displayed' );
        }
    });
},

_renderHeader: function() {
    return new ContentPane({ baseClass: 'header', region: 'top',  content: '<h1>Manage data hubs</h1>' });
},

_addAvailableHub: function( hub ) {
    this.availableHubsPane.addChild(
        new DataHubView(
            { dataHub: hub })
    );
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