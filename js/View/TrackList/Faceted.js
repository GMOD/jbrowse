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

       this.browser = args.browser;
       this.tracksActive = {};

       // data store that fetches and filters our track metadata
       this.trackDataStore = args.trackMetaData;

       // subscribe to commands coming from the the controller
       dojo.subscribe( '/jbrowse/v1/c/tracks/show',
                       dojo.hitch( this, 'setTracksActive' ));
       // subscribe to commands coming from the the controller
       dojo.subscribe( '/jbrowse/v1/c/tracks/hide',
                       dojo.hitch( this, 'setTracksInactive' ));

       // once its data is loaded and ready
       this.trackDataStore.onReady( dojo.hitch(this, function() {

           // render our controls and so forth
           this.render();

           // connect events so that when a grid row is selected or
           // deselected (with the checkbox), publish a message
           // indicating that the user wants that track turned on or
           // off
           dojo.connect( this.dataGrid.selection, 'onSelected', this, function( index ) {
               if( this.suppressSelectionEvents )
                   return;
               console.log('selected',arguments);
               dojo.publish( '/jbrowse/v1/v/tracks/show', [[this.dataGrid.getItem( index ).conf]] );
           });
           dojo.connect( this.dataGrid.selection, 'onDeselected', this, function( index ) {
               if( this.suppressSelectionEvents )
                   return;
               console.log('deselected',arguments);
               dojo.publish( '/jbrowse/v1/v/tracks/hide', [[this.dataGrid.getItem( index ).conf]] );
           });
       }));
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
        this._updateGridSelections();
        this.show();
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
                       //headerSelector: true
                   }
               }
           }
        );
        //monkey-patch this grid's onRowClick handler to not do
        //anything.  without this, clicking on a row selects it, and
        //deselects everything else.
        this.dataGrid.onRowClick = function() {};

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

            var facetPane = new dijit.layout.AccordionPane({
                    title: '<div id="facet_title_' + facetName +'" '
                           + 'class="facetTitle">'
                           + Util.ucFirst(facetName)
                           + ' <a style=\"float: right\">clear</a>'
                           + '</div>'
                });
            container.addChild(facetPane);

            // make a selection control for the values of this facet
            var facetControl = dojo.create( 'div', {className: 'facetSelect'}, facetPane.containerNode );
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
                              dojo.toggleClass(this, 'selected');
                              that._updateFacetControl( facetPane, facetName );
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

    _updateFacetControl: function( facetPane, facetName ) {
        var titleContent = dojo.byId('facet_title_'+facetName);
        if( dojo.some( this.facetSelectors[facetName] || [], function(sel) {
                return dojo.hasClass( sel, 'selected' );
            }, this ) ) {
                var clearFunc = dojo.hitch( this, function(evt) {
                    dojo.forEach( this.facetSelectors[facetName] || [], function(sel) {
                        dojo.removeClass(sel,'selected');
                    },this);
                    this._updateFacetControl( facetPane, facetName );
                    this.updateQuery();
                    evt.stopPropagation();
                });
                dojo.addClass( titleContent, 'selected' );
                dojo.query( '> a', titleContent )
                    .onclick( clearFunc )
                    .attr('title','clear selections');
        }
        else {
                dojo.removeClass( titleContent, 'selected' );
                dojo.query( '> a', titleContent )
                    .onclick( function(){return false;})
                    .removeAttr('title');
        }
    },

    /**
     * Update the query we are using with the track metadata store
     * based on the values of the search form elements.
     */
    updateQuery: function() {
        if( this.suppressUpdateQuery )
            return;
        this.suppressUpdateQuery = true;
        this._updateQuery();
        this.suppressUpdateQuery = false;
    },
    _updateQuery: function() {
        var newQuery = {};

        // update from the text filter
        if( this.textFilterInput.value.length ) {
            newQuery.text = this.textFilterInput.value;
        }

        // update from the facet selectors
        dojo.forEach( this.trackDataStore.getFacets(), function(facetName) {
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
        this.dataGrid.setQuery( this.query );
        this._updateGridSelections();
    },

    /**
     * Update the grid to have only rows checked that correspond to
     * tracks that are currently active.
     * @private
     */
    _updateGridSelections: function() {
        this.suppressSelectionEvents = true;

        this.dataGrid.selection.deselectAll();

        // check the boxes that should be checked, based on our
        // internal memory of what tracks should be on.
        for( var i= 0; i < this.dataGrid.rowCount; i++ ) {
            var item = this.dataGrid.getItem( i );
            var label = this.dataGrid.store.getIdentity( item );
            if( this.tracksActive[label] )
                this.dataGrid.rowSelectCell.toggleRow( i, true );
        }

        this.suppressSelectionEvents = false;
    },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned on.
     */
    setTracksActive: function( /**Array[Object]*/ trackConfigs ) {
        dojo.forEach( trackConfigs, function(conf) {
            this.tracksActive[conf.label] = true;
        },this);
        this.trackDataStore.onReady( dojo.hitch(this, '_updateGridSelections') );
    },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned off.
     */
    setTracksInactive: function( /**Array[Object]*/ trackConfigs ) {
        dojo.forEach( trackConfigs, function(conf) {
            delete this.tracksActive[conf.label];
        },this);
        this.trackDataStore.onReady( dojo.hitch(this, '_updateGridSelections') );
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