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
           dojo.connect( this.dataGrid.selection, 'onSelected', this, function(index) {
                         this._ifNotSuppressed( 'selectionEvents', function() {
                             this._suppress( 'gridUpdate', function() {
                                 dojo.publish( '/jbrowse/v1/v/tracks/show', [[this.dataGrid.getItem( index ).conf]] );
                             });
                         });

           });
           dojo.connect( this.dataGrid.selection, 'onDeselected', this, function(index) {
                         this._ifNotSuppressed( 'selectionEvents', function() {
                             this._suppress( 'gridUpdate', function() {
                                 dojo.publish( '/jbrowse/v1/v/tracks/hide', [[this.dataGrid.getItem( index ).conf]] );
                             });
                         });
           });
       }));
    },

    /**
     * Call the given callback if none of the given event suppression flags are set.
     * @private
     */
    _ifNotSuppressed: function( suppressFlags, callback ) {
        if( typeof suppressFlags == 'string')
            suppressFlags = [suppressFlags];
        if( !this.suppress)
            this.suppress = {};
        if( dojo.some( suppressFlags, function(f) {return this.suppress[f];}, this) )
            return undefined;
        return callback.call(this);
    },

    /**
     * Call the given callback while setting the given event suppression flags.
     * @private
     */
    _suppress: function( suppressFlags, callback ) {
        if( typeof suppressFlags == 'string')
            suppressFlags = [suppressFlags];
        if( !this.suppress)
            this.suppress = {};
        dojo.forEach( suppressFlags, function(f) {this.suppress[f] = true; }, this);
        var retval = callback.call( this );
        dojo.forEach( suppressFlags, function(f) {this.suppress[f] = false;}, this);
        return retval;
    },

    /**
     * Call a method of our object such that it cannot call itself
     * by way of event cycles.
     * @private
     */
    _suppressRecursion: function( methodName ) {
        var flag   = ['method_'+methodName];
        var method = this[methodName];
        return this._ifNotSuppressed( flag, function() { this._suppress( flag, method );});
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
            { design: 'headline', gutters: false },
            this.containerElem
        );
        this.topPane = new dijit.layout.ContentPane(
            { region: 'top',
              id: "faceted_tracksel_top",
              content: '<div class="title">Select Tracks</div> '
                       + '<button class="faceted_tracksel_on_off">Back to browser</button>'
                       + '<div class="topLink" style="cursor: help"><a title="Help">Help</a></div>'
            });
        dojo.query('div.topLink a[title="Help"]',this.topPane.domNode)
            .forEach(function(helplink){
                var helpdialog = new dijit.Dialog({
                    "class": 'help_dialog',
                    refocus: false,
                    draggable: false,
                    title: 'Track Selection',
                    content: '<div class="main">'
                             + '  <dl><dt>Finding Tracks</dt>'
                             + '  <dd>Find tracks by selecting data categories on the left, typing text to search for, or both.</dd>'
                             + '  <dt>Activating Tracks</dt>'
                             + "  <dd>Click a track's check box to display it in the browser.</dd>"
                             + "  </dl>"
                             + "</div>"
                 });
                dojo.connect( helplink, 'onclick', this, function(evt) {helpdialog.show(); return false;});
            },this);

        // add a button to the main browser window that shows this tracksel
        if( this.browser.config.show_nav != 0 ) {
            // (insertBefore the firstChild so that it's on the left of the navbox)
            this.browser.navbox.insertBefore(
                dojo.create('button', {
                                className: 'faceted_tracksel_on_off',
                                innerHTML: 'Select tracks'
                            }),
                this.browser.navbox.firstChild
            );
        }

        this.mainContainer.addChild( this.topPane );

        // make both buttons toggle this track selector
        dojo.query( 'button.faceted_tracksel_on_off' )
            .onclick( dojo.hitch( this, 'toggle' ));

        // make our main components
        var textFilterContainer = this.renderTextFilter();
        var facetContainer = this.renderFacetSelectors();
        this.dataGrid = this.renderGrid();

        // put them in their places in the overall layout of the track selector
        facetContainer.set('region','left');
        this.mainContainer.addChild( facetContainer );
        var centerPane = new dijit.layout.BorderContainer({region: 'center', "class": 'gridPane', gutters: false});
        this.dataGrid.set('region','center');
        centerPane.addChild( this.dataGrid );
        centerPane.addChild( new dijit.layout.ContentPane({region: 'top', "class": 'gridControls', content: textFilterContainer}));
        this.mainContainer.addChild( centerPane );

        this.mainContainer.startup();
        this._updateGridSelections();
        this.show();
    },

    renderGrid: function() {
        // make a data grid that will hold the search results
        var facets = this.trackDataStore.getFacets();
        var rename = { key: 'name' }; // rename some columns in the grid
        var grid = new dojox.grid.EnhancedGrid({
               id: 'trackSelectGrid',
               store: this.trackDataStore,
               structure: [
                   dojo.map( facets, function(facetName) {
                     return {'name': Util.ucFirst(rename[facetName]||facetName), 'field': facetName, 'width': '100px'};
                   })
               ],
               plugins: {
                   indirectSelection: {
                       headerSelector: true
                   }
               }
           }
        );

        // monkey-patch the grid's onRowClick handler to not do
        // anything.  without this, clicking on a row selects it, and
        // deselects everything else, which is quite undesirable.
        grid.onRowClick = function() {};

        // monkey-patch the grid's range-selector to refuse to select
        // if the selection is too big
        var origSelectRange = grid.selection.selectRange;
        grid.selection.selectRange = function( inFrom, inTo ) {
            var selectionLimit = 30;
            if( inTo - inFrom > selectionLimit ) {
                alert( "Too many tracks selected, please select fewer than "+selectionLimit+" tracks." );
                return undefined;
            }
            return origSelectRange.apply( this, arguments );
        };

        return grid;
    },

    renderTextFilter: function( parent ) {
        // make the text input for text filtering
        var textFilterLabel = dojo.create(
            'label',
            { className: 'textFilterControl',
              innerHTML: 'Contains text ',
              id: 'tracklist_textfilter'
            },
            parent
        );
        this.textFilterInput = dojo.create(
            'input',
            { type: 'text',
              width: 50,
              disabled: true, // disabled until shown
              onkeypress: dojo.hitch( this, function(evt) {
                  if( this.textFilterTimeout )
                      window.clearTimeout( this.textFilterTimeout );
                  this.textFilterTimeout = window.setTimeout(
                      dojo.hitch(this,function(){ this.updateQuery(); this.textFilterInput.focus(); }),
                      400
                  );
                  evt.stopPropagation();
              })
            },
            textFilterLabel
        );

        return textFilterLabel;
    },

    /**
     * Create selection boxes for each searchable facet.
     */
    renderFacetSelectors: function() {
        var container = new dijit.layout.AccordionContainer({style: 'width: 200px'});
        container.domNode.style.overflowY = 'auto';
        this.mainContainer.addChild( container );

        var store = this.trackDataStore;
        this.facetSelectors = {};
        var renderFacets = dojo.filter( store.getFacets(), function(facet) {
            return ! dojo.some( store.getLabelAttributes(), function(l) {return l == facet;} );
        });
        dojo.forEach( renderFacets, function(facetName) {
            // get the values of this facet
            var values = store.getFacetValues(facetName).sort();
            if( !values || !values.length )
                return;

            var facetPane = new dijit.layout.AccordionPane({
                    title: '<div id="facet_title_' + facetName +'" '
                           + 'class="facetTitle">'
                           + Util.ucFirst(facetName)
                           + ' <a style="float: right"><img src="img/red_x.png" /></a>'
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

        return container;
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
        this._suppressRecursion( '_updateQuery' );
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
        // keep selection events from firing while we mess with the
        // grid
        this._ifNotSuppressed('gridUpdate', function(){
            this._suppress('selectionEvents', function() {
                this.dataGrid.selection.deselectAll();

                // check the boxes that should be checked, based on our
                // internal memory of what tracks should be on.
                for( var i= 0; i < this.dataGrid.rowCount; i++ ) {
                    var item = this.dataGrid.getItem( i );
                    var label = this.dataGrid.store.getIdentity( item );
                    if( this.tracksActive[label] )
                        this.dataGrid.rowSelectCell.toggleRow( i, true );
                }

            });
        });
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
        window.setTimeout( dojo.hitch( this, function() {
            this.textFilterInput.disabled = false;
            this.textFilterInput.focus();
        }), 300);

        this.containerElem.style.opacity = 1.0;
        this.containerElem.style.zIndex = 500;

        this.shown = true;
    },

    /**
     * Make the track selector invisible.
     */
    hide: function() {
        this.containerElem.style.opacity = 0;
        this.containerElem.style.zIndex = -1000;

        this.textFilterInput.blur();
        this.textFilterInput.disabled = true;

        this.shown = false;
    },

    /**
     * Toggle whether the track selector is visible.
     */
    toggle: function() {
        this.shown ? this.hide() : this.show();
    }
});