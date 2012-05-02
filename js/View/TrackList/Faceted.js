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
           { type: 'text',
             width: 30,
             onchange: dojo.hitch( this, 'updateQuery' )
           },
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

       // put it all in a pop-up dialog
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
        this.facetSelectors = {};
        dojo.forEach( store.getFacets() , function(facetName) {
            // get the values of this facet
            var values = store.getFacetValues(facetName).sort();
            if( !values || !values.length )
                return;

            // make a selection control for the values of this facet
            var group = this.facetSelectors[facetName] = [];
            var div = dojo.create( 'div', {className: 'facetSelect'}, this.facetsDiv );

            // populate selector's options
            this.facetSelectors[facetName] = dojo.map(
                values,
                function(val) {
                    var that = this;
                    return dojo.create(
                        'div',
                        { className: 'facetValue',
                          innerHTML: val,
                          title: val,
                          onclick: function(evt) {
                              dojo.toggleClass(this,'selected');
                              that.updateQuery();
                          }
                        },
                        div
                    );
                },this
            );
        },this);
    },


    /**
     * Update the query we are using with the track metadata store
     * based on the values of the search form elements.
     */
    updateQuery: function() {
        var newQuery = {};

        // update from the text filter
        if( this.textFilterInput.value.length ) {
            newQuery.text = this.textFilterInput.value;
        }

        // update from the facet selectors
        dojo.forEach( this.trackDataStore.getFacets(),
                      function(facetName) {
                          var options = this.facetSelectors[facetName];
                          if( !options ) return;

                          var selectedFacets = dojo.map(
                              dojo.filter(
                                  options,
                                  function(opt) {return dojo.hasClass(opt,'selected');}
                              ),
                              function(opt) {return opt.title;}
                          );
                          if( selectedFacets.length )
                              newQuery[facetName] = selectedFacets;
        },this);

       this.query = newQuery;
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