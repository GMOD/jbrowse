/**
 * Tree view of the contents of a single DataHub.  Not very scalable
 * to large numbers of tracks, stores, or ref seqs.  More scalable
 * views, probably faceted, will need to be implemented at some point.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array',

           'dijit/_WidgetBase',
           'dijit/_Container',
           'dijit/layout/ContentPane',
           'dijit/TitlePane',

           'dgrid/OnDemandGrid'
       ],
       function(
           declare,
           array,

           _WidgetBase,
           _Container,
           ContentPane,
           TitlePane,

           DGrid
       ) {

return declare( 'JBrowse/View/DataHubManager/DataHub',
                TitlePane,
                {

doLayout: true,

constructor: function( args ) {
    this.title = args.dataHub.getConf('name');
},

buildRendering: function() {
    this.inherited(arguments);

    var thisB = this;
    this.get('dataHub').getMetadataStore()
        .then( function( store ) {

                   // make a TitlePane for Reference Sets, Tracks, and Stores
                   function makePane( title, contentD ) {
                       var tpane = new TitlePane({ title: title, open: false });
                       contentD.then( function(content) { tpane.addChild( content ); } );
                       return tpane;
                   }

                   thisB.addChild( makePane( 'Reference Sets', thisB._renderRefSetList() ) );
                   thisB.addChild( makePane( 'Tracks', thisB._renderTrackList() ) );
                   thisB.addChild( makePane( 'Stores', thisB._renderStoreList() ) );
               });
},

_renderRefSetList: function() {
    return this.get('dataHub').getMetadataStore()
        .then( function( store ) {
               var g = new DGrid({ store: store,
                                   query: { type: 'refset' },
                                   columns: [ {label: 'Name', field: 'name' } ]
                                 });
                   g.refresh();
                   return g;
               });
},
_renderTrackList: function() {
    return this.get('dataHub').getMetadataStore()
        .then( function( store ) {
                   var g = new DGrid({ store: store,
                                       query: { type: 'track' },
                                       columns: [ {label: 'Name', field: 'name' } ]
                                     });
                   g.refresh();
                   return g;
               });
},
_renderStoreList: function() {
    return this.get('dataHub').getMetadataStore()
        .then( function( store ) {
                   var g = new DGrid({ store: store,
                                       query: { type: 'store' },
                                       columns: [ {label: 'Name', field: 'name' } ]
                                     });
                   g.refresh();
                   return g;
               });
}

});
});