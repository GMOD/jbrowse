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

       // construct the discriminator for whether we will display a
       // facet selector for this facet
       this._isSelectableFacet = function() {
           // just a function returning true if not specified
           var filter = args.selectableFacets ||
               // default facet filtering function
               function( store, facetName ){
                   return (
                       // has an avg bucket size > 1
                       store.getFacetStats( facetName ).avgBucketSize > 1
                    &&
                       // and not an ident or label attribute
                       ! dojo.some( store.getLabelAttributes()
                                    .concat( store.getIdentityAttributes() ),
                                    function(l) {return l == facetName;}
                                  )
                   );
               };
           // if we have a non-function filter, coerce to an array,
           // then convert that array to a function
           if( typeof filter == 'string' )
               filter = [filter];
           if( Array.isArray( filter ) ) {
               filter = function( store, facetName) {
                   return dojo.some( filter, function(fn) {
                                         return facetName == fn;
                                     });
               };
           }
           return filter;
       }.call(this);

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
                       + '<div class="topLink" style="cursor: help"><a title="Track selector help">Help</a></div>'
            });
        dojo.query('div.topLink a[title="Track selector help"]',this.topPane.domNode)
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
        centerPane.addChild(
            new dijit.layout.ContentPane(
                { region: 'top',
                  "class": 'gridControls',
                  content: [
                      dojo.create( 'button', {
                                       className: 'clear_filters',
                                       innerHTML:'<img style="position: relative; bottom: -3px;" src="img/red_x.png">'
                                                 + ' Clear All Filters',
                                       onclick: dojo.hitch( this, function(evt) {
                                           this.textFilterInput.value = '';
                                           this._clearAllFacetControls();
                                           this.updateQuery();
                                       })
                                   }
                                 ),
                      textFilterContainer
                  ]
                }
            )
        );
        this.mainContainer.addChild( centerPane );

        this.mainContainer.startup();
        this._updateGridSelections();
        this.show();
    },

    renderGrid: function() {
        // make a data grid that will hold the search results
        var facets = this.trackDataStore.getFacetNames();
        var rename = { key: 'name' }; // rename some columns in the grid
        var grid = new dojox.grid.EnhancedGrid({
               id: 'trackSelectGrid',
               store: this.trackDataStore,
               noDataMessage: "No tracks match the filtering criteria.",
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


        this._monkeyPatchGrid( grid );
        return grid;
    },

    /**
     * Apply several run-time patches to the dojox.grid.EnhancedGrid
     * code.
     * @private
     */
    _monkeyPatchGrid: function( grid ) {
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

        // monkey-patch the grid's scrolling handler to fix
        // http://bugs.dojotoolkit.org/ticket/15343
        // diff between this and its implementation in dojox.grid._View.js (1.6.1) is only:
        // if(top !== this.lastTop)  --->  if( Math.abs( top - this.lastTop ) > 1 )
        grid.views.views[0].doscroll = function(inEvent){
                //var s = dojo.marginBox(this.headerContentNode.firstChild);
                var isLtr = dojo._isBodyLtr();
                if(this.firstScroll < 2){
                        if((!isLtr && this.firstScroll == 1) || (isLtr && this.firstScroll === 0)){
                                var s = dojo.marginBox(this.headerNodeContainer);
                                if(dojo.isIE){
                                        this.headerNodeContainer.style.width = s.w + this.getScrollbarWidth() + 'px';
                                }else if(dojo.isMoz){
                                        //TODO currently only for FF, not sure for safari and opera
                                        this.headerNodeContainer.style.width = s.w - this.getScrollbarWidth() + 'px';
                                        //this.headerNodeContainer.style.width = s.w + 'px';
                                        //set scroll to right in FF
                                        this.scrollboxNode.scrollLeft = isLtr ?
                                                this.scrollboxNode.clientWidth - this.scrollboxNode.scrollWidth :
                                                this.scrollboxNode.scrollWidth - this.scrollboxNode.clientWidth;
                                }
                        }
                        this.firstScroll++;
                }
                this.headerNode.scrollLeft = this.scrollboxNode.scrollLeft;
                // 'lastTop' is a semaphore to prevent feedback-loop with setScrollTop below
                var top = this.scrollboxNode.scrollTop;
                if(Math.abs( top - this.lastTop ) > 1 ){
                        this.grid.scrollTo(top);
                }
        };
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
              size: 50,
              disabled: true, // disabled until shown
              onkeypress: dojo.hitch( this, function(evt) {
                  if( evt.keyCode == dojo.keys.SHIFT || evt.keyCode == dojo.keys.CTRL || evt.keyCode == dojo.keys.ALT )
                      return;
                  if( this.textFilterTimeout )
                      window.clearTimeout( this.textFilterTimeout );
                  this.textFilterTimeout = window.setTimeout(
                      dojo.hitch( this, function() {
                                      this.textFilterPreviousValue = this.textFilterInput.value;
                                      this.updateQuery();
                                      this.textFilterInput.focus();
                                  }),
                      600
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

        var store = this.trackDataStore;
        this.facetSelectors = {};

        // render a facet selector for a pseudo-facet holding
        // attributes regarding the tracks the user has been working
        // with
        var usageFacet = this._renderFacetSelector(
            'My Tracks', ['Currently Active', 'Recently Used'] );
        usageFacet.set('class', 'myTracks' );
        container.addChild( usageFacet );

        // for the facets from the store, only render facet selectors
        // for ones that are not identity attributes, and have an
        // average bucket size greater than 1
        var storeFacets =
            dojo.filter( store.getFacetNames(),
                         dojo.hitch( this, '_isSelectableFacet', store )
                       );
        dojo.forEach( storeFacets, function(facetName) {

            // get the values of this facet
            var values = store.getFacetValues(facetName).sort();
            if( !values || !values.length )
                return;

            var facetPane = this._renderFacetSelector( facetName, values );
            container.addChild( facetPane );
        },this);

        return container;
    },

    /**
     * Make HTML elements for a single facet selector.
     * @private
     * @returns {dijit.layout.AccordionPane}
     */
    _renderFacetSelector: function( /**String*/ facetName, /**Array[String]*/ values ) {

        var facetPane = new dijit.layout.AccordionPane(
            {
                title: '<div id="facet_title_' + facetName +'" '
                    + 'class="facetTitle">'
                    + Util.ucFirst(facetName)
                    + ' <a class="clearFacet"><img src="img/red_x.png" /></a>'
                    + '</div>'
            });

        // make a selection control for the values of this facet
        var facetControl = dojo.create( 'div', {className: 'facetSelect'}, facetPane.containerNode );
        // populate selector's options
        this.facetSelectors[facetName] = dojo.map(
            values,
            function(val) {
                var that = this;
                var node = dojo.create(
                    'div',
                    { className: 'facetValue',
                      innerHTML: val,
                      onclick: function(evt) {
                          dojo.toggleClass(this, 'selected');
                          that._updateFacetControl( facetName );
                          that.updateQuery();
                      }
                    },
                    facetControl
                );
                node.facetValue = val;
                return node;
            },
            this
        );

        return facetPane;
    },

    /**
     * Clear all the selections from all of the facet controls.
     * @private
     */
    _clearAllFacetControls: function() {
       dojo.forEach( dojof.keys( this.facetSelectors ), function( facetName ) {
           this._clearFacetControl( facetName );
       },this);
    },

    /**
     * Clear all the selections from the facet control with the given name.
     * @private
     */
    _clearFacetControl: function( facetName ) {
        dojo.forEach( this.facetSelectors[facetName] || [], function(selector) {
                          dojo.removeClass(selector,'selected');
                      },this);
        this._updateFacetControl( facetName );
    },

    /**
     * Update the title bar of the given facet control to reflect
     * whether it has selected values in it.
     */
    _updateFacetControl: function( facetName ) {
        var titleContent = dojo.byId('facet_title_'+facetName);

        // if we have some selected values
        if( dojo.some( this.facetSelectors[facetName] || [], function(sel) {
                return dojo.hasClass( sel, 'selected' );
            }, this ) ) {
                var clearFunc = dojo.hitch( this, function(evt) {
                    this._clearFacetControl( facetName );
                    this.updateQuery();
                    evt.stopPropagation();
                });
                dojo.addClass( titleContent, 'selected' );
                dojo.query( '> a', titleContent )
                    .onclick( clearFunc )
                    .attr('title','clear selections');
        }
        // otherwise, no selected values
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

        var is_selected = function(node) {
            return dojo.hasClass(node,'selected');
        };

        // update from the My Tracks pseudofacet
        (function() {
             var mytracks_options = this.facetSelectors['My Tracks'];

             // index the optoins by name
             var byname = {};
             dojo.forEach( mytracks_options, function(opt){ byname[opt.facetValue] = opt;});

             // if filtering for active tracks, add the labels for the
             // currently selected tracks to the query
             if( is_selected( byname['Currently Active'] ) ) {
                 var activeTrackLabels = dojof.keys(this.tracksActive || {});
                 newQuery.label = Util.uniq(
                     (newQuery.label ||[])
                     .concat( activeTrackLabels )
                 );
             }

             // if filtering for recently used tracks, add the labels of recently used tracks
             if( is_selected( byname['Recently Used'])) {
                 var recentlyUsed = dojo.map(
                     this.browser.getRecentlyUsedTracks(),
                     function(t){
                         return t.label;
                     }
                 );

                 newQuery.label = Util.uniq(
                     (newQuery.label ||[])
                     .concat(recentlyUsed)
                 );
             }

             // finally, if something is selected in here, but we have
             // not come up with any track labels, then insert a dummy
             // track label value that will never match, because the
             // query engine ignores empty arrayrefs.
             if( ( ! newQuery.label || ! newQuery.label.length )
                 && dojo.some( mytracks_options, is_selected )
               ) {
                   newQuery.label = ['FAKE LABEL THAT IS HIGHLY UNLIKELY TO EVER MATCH ANYTHING'];
             }

        }).call(this);

        // update from the text filter
        if( this.textFilterInput.value.length ) {
            newQuery.text = this.textFilterInput.value;
        }

        // update from the data-based facet selectors
        dojo.forEach( this.trackDataStore.getFacetNames(), function(facetName) {
            var options = this.facetSelectors[facetName];
            if( !options ) return;

            var selectedFacets = dojo.map(
                dojo.filter( options, is_selected ),
                function(opt) {return opt.facetValue;}
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
                for( var i= 0; i < Math.min( this.dataGrid.get('rowCount'), this.dataGrid.get('rowsPerPage') ); i++ ) {
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