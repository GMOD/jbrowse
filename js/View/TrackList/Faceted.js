dojo.declare( 'JBrowse.View.TrackList.Faceted', null,
   /**
    * @lends JBrowse.View.TrackList.Faceted.prototype
    */
   {

   /**
     * Track selector with facets and text searching.
     * @constructs
     */
   constructor: function(args) {
       dojo.require('dojox.grid.DataGrid');
       dojo.require('dojo.data.ItemFileWriteStore');
       dojo.require('dojo.store.Memory');

       // data store that fetches and filters our track metadata
       this.trackDataStore = args.trackMetaData;

       // the div that will hold all of the track selector content
       var grid_div = dojo.create('div', {
           style: {
               height: '95%',
               width:  '94%'
           }
         },
         document.body
       );

       // schedule the facet selectors to render once the data is loaded
       this.facetsDiv = dojo.create( 'div',{ className: 'facetSelectorContainer' }, grid_div);
       this.trackDataStore.onReady( dojo.hitch(this, 'renderFacetSelectors') );

       // make the text input for text filtering
       this.textFilterInput = dojo.create(
           'input',
           { type: 'text', width: 30 },
           dojo.create('label',{innerHTML: 'Containing text', id: 'tracklist_textfilter'}, grid_div )
       );

       // make a data grid that will hold the search results
       this.dataGrid = new dojox.grid.DataGrid({
               id: 'grid',
               store: this.trackDataStore,
               structure: [[
                     {'name': 'Type', 'field': 'type', 'width': '100px'},
                     {'name': 'Key',  'field': 'key',  'width': '100px'}
               ]]
               //rowSelector: '20px'
           },
           document.createElement('div')
       );
       grid_div.appendChild(this.dataGrid.domNode);
       this.dataGrid.startup();

       // put it all in a dialog
       this.dialog = new dijit.Dialog({
           id: "faceted_tracksel",
           refocus: false,
           draggable: false,
           resizable: true,
           title: "Track Selection",
           style: "width: 95%;"
         },
         grid_div
      );
   },

    /**
     * Create selection boxes for each searchable facet.
     */
    renderFacetSelectors: function( facets ) {
        var store = this.trackDataStore;
        dojo.forEach( store.getFacets() , function(facetName) {
            var values = store.getFacetValues(facetName).sort();
            if( !values || !values.length )
                return;

            var selector =
                dojo.create( 'select', { multiple: true, size: Math.min( 10, values.length ) },
                             dojo.create( 'label', {innerHTML: facetName},
                                          this.facetsDiv ));

            dojo.forEach( values, function(val) {
                dojo.create( 'option', { innerHTML: val, value: val }, selector );
            },this);

        },this);
    },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned on.
     */
    setTracksActive: function( /**Array[Object]*/ trackConfigs ) {
    },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned off.
     */
    setTracksInactive: function( /**Array[Object]*/ trackConfigs ) {
    },

    /**
     * Make the track selector visible.
     */
    show: function() {
        this.dialog.show();
        this.shown = true;
    },

    /**
     * Make the track selector invisible.
     */
    hide: function() {
        this.dialog.hide();
        this.shown = false;
    },

    /**
     * Toggle whether the track selector is visible.
     */
    toggle: function() {
        this.shown ? this.hide() : this.show();
    }
});