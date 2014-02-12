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
           'dijit/TitlePane',

           'dgrid/OnDemandGrid'
       ],
       function(
           declare,
           array,

           _WidgetBase,
           _Container,
           TitlePane,

           DGrid
       ) {

return declare( 'JBrowse/View/DataHubManager/DataHub',
                TitlePane,
                {

open: false,

constructor: function( args ) {
    this.title = args.dataHub.getConf('name');
},

buildRendering: function() {
    this.inherited(arguments);

    var store = this.get('dataHub').getDojoStore();

    // make a TitlePane for Reference Sets, Tracks, and Stores
    function makePane( title, content ) {
        var tpane = new TitlePane({ title: title, open: false });
        tpane.addChild( content );
        return tpane;
    }

    this.addChild( makePane( 'Reference Sets', this._renderRefSetList() ) );
    this.addChild( makePane( 'Tracks', this._renderTrackList() ) );
    this.addChild( makePane( 'Stores', this._renderStoreList() ) );
},

_renderRefSetList: function() {
    var store = this.get('dataHub').getDojoStore();
    var g = new DGrid({ store: store,
                       query: { type: 'refset' },
                       columns: [ {label: 'Name', field: 'name' } ]
                     });
    g.refresh();
    return g;
},
_renderTrackList: function() {
    var store = this.get('dataHub').getDojoStore();
    var g = new DGrid({ store: store,
                       query: { type: 'track' },
                       columns: [ {label: 'Name', field: 'name' } ]
                     });
    g.refresh();
    return g;
},
_renderStoreList: function() {
    var store = this.get('dataHub').getDojoStore();
    var g = new DGrid({ store: store,
                       query: { type: 'store' },
                       columns: [ {label: 'Name', field: 'name' } ]
                     });
    g.refresh();
    return g;
}

});
});