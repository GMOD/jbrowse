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

return declare( 'JBrowse/View/DataHubManager/DataHubTree',
                [_WidgetBase, _Container], {


buildRendering: function() {
    this.inherited(arguments);

    var store = this.get('dataHub').getDojoStore();

    // make a TitlePane for Reference Sets, Tracks, and Stores
    function makePane( title, children ) {
        var tpane = new TitlePane({ title: title, open: false });
        array.forEach( children, tpane.addChild, tpane );
        array.forEach( children, function(c) {
                           if( typeof c.refresh == 'function' )
                               c.refresh();
                       });
        return tpane;
    }
    this.addChild(
        makePane( 'Reference Sets',
                  [ new DGrid({ store: store,
                                query: { type: 'refset' },
                                columns: [ {label: 'Name', field: 'name' } ]
                              })
                  ]
                )
    );
    this.addChild(
        makePane( 'Tracks',
                  [ new DGrid({ store: store,
                                query: { type: 'track' },
                                columns: [ {label: 'Name', field: 'name' } ]
                              })
                  ]
                )
    );
    this.addChild(
        makePane( 'Stores',
                  [ new DGrid({ store: store,
                                query: { type: 'store' },
                                columns: [ {label: 'Name', field: 'name' } ]
                              })
                  ]
                )
    );
}

});
});