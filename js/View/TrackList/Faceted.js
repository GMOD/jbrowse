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
       dojo.require('dijit.layout.AccordionContainer');
       dojo.require('dijit.layout.AccordionPane');

       // data store that fetches and filters our track metadata
       this.trackDataStore = args.trackMetaData;
       this.trackDataStore.onReady( dojo.hitch(this, 'render') );
    },

    render: function() {
        this.dialog = new dijit.Dialog({
            id: "faceted_tracksel",
            refocus: false,
            draggable: false,
            resizable: true,
            title: "Track Selection"
         });

        var div = dojo.create( 'div', {
            style: {
                height: document.body.clientHeight + 'px',
                width: document.body.clientWidth + 'px'
            }
        }, this.dialog.containerNode );

        this.mainContainer = new dijit.layout.BorderContainer(
            { design: 'sidebar'  },
            div
        );
        this.renderTextFilter();
        this.renderFacetSelectors();
        this.renderGrid();
        this.mainContainer.startup();
    },

    renderGrid: function() {
        var gridPane = new dijit.layout.ContentPane(
            {
                region: 'center',
//                style: { height: document.body.clientHeight * 0.6 + 'px' }
            }
        );
        this.mainContainer.addChild( gridPane );
        // make a data grid that will hold the search results
        var facets = this.trackDataStore.getFacets();
        this.dataGrid = new dojox.grid.DataGrid({
               id: 'trackSelectGrid',
               region: 'top',
               store: this.trackDataStore,
               structure: [
                   dojo.map( facets, function(facetName) {
                     return {'name': Util.ucFirst(facetName), 'field': facetName, 'width': '100px'};
                   })
               ],
               autoHeight: true,
               style: {
                   width: (20+facets.length * 100) + 'px'
               }
           },
           gridPane.containerNode
       );
    },

    renderTextFilter: function() {
        var textPane = new dijit.layout.ContentPane({region: 'top', height: '2em'});
        this.mainContainer.addChild( textPane );
        // make the text input for text filtering
        var textFilterLabel = dojo.create(
            'label',
            { className: 'textFilterControl',
              innerHTML: 'Containing text<br>',
              id: 'tracklist_textfilter'
            },
            textPane.containerNode
        );
        this.textFilterInput = dojo.create(
            'input',
            { type: 'text',
              width: 30,
              onchange: dojo.hitch( this, 'updateQuery' ),
              onkeypress: function(e){ e.stopPropagation(); }
            },
            textFilterLabel
        );
    },

    /**
     * Create selection boxes for each searchable facet.
     */
    renderFacetSelectors: function() {
        var container = new dijit.layout.AccordionContainer({region: 'left',style: 'width: 200px'});
        this.mainContainer.addChild( container );

        var store = this.trackDataStore;
        this.facetSelectors = {};
        dojo.forEach( store.getFacets() , function(facetName) {
            // get the values of this facet
            var values = store.getFacetValues(facetName).sort();
            if( !values || !values.length )
                return;

            var facetPane = new dijit.layout.AccordionPane({title: Util.ucFirst(facetName)});
            container.addChild(facetPane);

            // make a selection control for the values of this facet
            var facetControl = dojo.create( 'div', {className: 'facetSelect'}, facetPane.containerNode );
            //dojo.create('div',{className: 'facetName', innerHTML: Util.ucFirst(facetName) }, div );
            // populate selector's options
            this.facetSelectors[facetName] = dojo.map(
                values,
                function(val) {
                    var that = this;
                    return dojo.create(
                        'div',
                        { className: 'facetValue',
                          innerHTML: val,
                          onclick: function(evt) {
                              dojo.toggleClass(this,'selected');
                              that.updateQuery();
                          }
                        },
                        facetControl
                    );
                },
                this
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
                              function(opt) {return opt.innerHTML;}
                          );
                          if( selectedFacets.length )
                              newQuery[facetName] = selectedFacets;
        },this);

        this.query = newQuery;
        console.log(this.query);
        this.dataGrid.setQuery( this.query );
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