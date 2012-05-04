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
       dojo.require('dojox.grid.EnhancedGrid');
       dojo.require('dojox.grid.enhanced.plugins.IndirectSelection');
       dojo.require('dijit.layout.AccordionContainer');
       dojo.require('dijit.layout.AccordionPane');

       // data store that fetches and filters our track metadata
       this.trackDataStore = args.trackMetaData;
       this.trackDataStore.onReady( dojo.hitch(this, 'render') );
    },

    render: function() {
        this.containerElem = dojo.create( 'div', {
            id: 'faceted_tracksel',
            style: {
                position: 'fixed',
                top: '0',
                left: '0',
                height: '100%',
                width: '100%',
                zIndex: -1000,
                opacity: 0
            }
        },
        document.body );

        this.mainContainer = new dijit.layout.BorderContainer(
            { design: 'sidebar', gutters: false },
            this.containerElem
        );
        this.topPane = new dijit.layout.ContentPane(
            { region: 'top',
              id: "faceted_tracksel_top",
              content: '<h1>Select Tracks</h1>'
            });
        this.mainContainer.addChild( this.topPane );
        this.renderTextFilter();
        this.renderFacetSelectors();
        this.renderGrid();
        this.mainContainer.startup();
    },

    renderGrid: function() {
        // make a data grid that will hold the search results
        var facets = this.trackDataStore.getFacets();
        this.dataGrid = new dojox.grid.EnhancedGrid({
               id: 'trackSelectGrid',
               region: 'center',
               store: this.trackDataStore,
               structure: [
                   dojo.map( facets, function(facetName) {
                     return {'name': Util.ucFirst(facetName), 'field': facetName, 'width': '100px'};
                   })
               ],
               plugins: {
                   indirectSelection: {
                       headerSelector: true
                   }
               }
           }
       );
        this.mainContainer.addChild( this.dataGrid );
    },

    renderTextFilter: function() {
        // make the text input for text filtering
        var textFilterLabel = dojo.create(
            'label',
            { className: 'textFilterControl',
              innerHTML: 'Containing text ',
              id: 'tracklist_textfilter'
            },
            this.topPane.containerNode
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
        this.containerElem.style.opacity = 1.0;
        this.containerElem.style.zIndex = 10000;
        this.shown = true;
    },

    /**
     * Make the track selector invisible.
     */
    hide: function() {
        this.containerElem.style.opacity = 0;
        this.containerElem.style.zIndex = -1000;
        this.shown = false;
    },

    /**
     * Toggle whether the track selector is visible.
     */
    toggle: function() {
        this.shown ? this.hide() : this.show();
    }
});