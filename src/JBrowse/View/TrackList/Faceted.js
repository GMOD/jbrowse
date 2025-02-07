import dompurify from 'dompurify'

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/promise/all',
  'dijit/TitlePane',
  'dijit/layout/ContentPane',
  'JBrowse/Util',
  'dojox/grid/EnhancedGrid',
  'dojox/grid/enhanced/plugins/IndirectSelection',
], function (
  declare,
  array,
  lang,
  Deferred,
  all,
  TitlePane,
  ContentPane,
  Util,
  EnhancedGrid,
) {
  var dojof = Util.dojof
  return declare(
    'JBrowse.View.TrackList.Faceted',
    null,
    /**
     * @lends JBrowse.View.TrackList.Faceted.prototype
     */
    {
      /**
       * Track selector with facets and text searching.
       * @constructs
       */
      constructor: function (args) {
        this.browser = args.browser
        this.tracksActive = {}
        this.config = args

        this.storeReady = new Deferred()
        this.gridReady = new Deferred()
        this.ready = all([this.storeReady, this.gridReady])

        // construct the discriminator for whether we will display a
        // facet selector for this facet
        this._isSelectableFacet = this._coerceFilter(
          args.selectableFacetFilter ||
            // default facet filtering function
            function (facetName, store) {
              return (
                // has an avg bucket size > 1
                store.getFacetStats(facetName).avgBucketSize > 1 &&
                // and not an ident or label attribute
                !array.some(
                  store
                    .getLabelAttributes()
                    .concat(store.getIdentityAttributes()),
                  function (l) {
                    return l == facetName
                  },
                )
              )
            },
        )

        // construct a similar discriminator for which columns will be displayed
        this.displayColumns = args.displayColumns
        this._isDisplayableColumn = this._coerceFilter(
          args.displayColumnFilter ||
            function (l) {
              return l.toLowerCase() != 'label'
            },
        )

        // data store that fetches and filters our track metadata
        this.trackDataStore = args.trackMetaData
        console.log(args.trackMetaData)

        // subscribe to commands coming from the the controller
        this.browser.subscribe(
          '/jbrowse/v1/c/tracks/show',
          lang.hitch(this, 'setTracksActive'),
        )
        // subscribe to commands coming from the the controller
        this.browser.subscribe(
          '/jbrowse/v1/c/tracks/hide',
          lang.hitch(this, 'setTracksInactive'),
        )
        this.browser.subscribe(
          '/jbrowse/v1/c/tracks/delete',
          lang.hitch(this, 'setTracksInactive'),
        )

        this.renderInitial()

        // once its data is loaded and ready
        this.trackDataStore.onReady(this, function () {
          // render our controls and so forth
          this.renderSelectors()

          // connect events so that when a grid row is selected or
          // deselected (with the checkbox), publish a message
          // indicating that the user wants that track turned on or
          // off
          dojo.connect(
            this.dataGrid.selection,
            'onSelected',
            this,
            function (index) {
              this._ifNotSuppressed('selectionEvents', function () {
                this._suppress('gridUpdate', function () {
                  this.browser.publish('/jbrowse/v1/v/tracks/show', [
                    this.dataGrid.getItem(index).conf,
                  ])
                })
              })
            },
          )
          dojo.connect(
            this.dataGrid.selection,
            'onDeselected',
            this,
            function (index) {
              this._ifNotSuppressed('selectionEvents', function () {
                this._suppress('gridUpdate', function () {
                  this.browser.publish('/jbrowse/v1/v/tracks/hide', [
                    this.dataGrid.getItem(index).conf,
                  ])
                })
              })
            },
          )

          this._updateFacetCounts()
          this._updateMatchCount()
          this.storeReady.resolve()

          dojo.connect(this.trackDataStore, 'onFetchSuccess', this, () => {
            this._updateGridSelections()
            this._updateMatchCount()
          })
        })
      },

      /**
       * Coerces a string or array of strings into a function that,
       * given a string, returns true if the string matches one of the
       * given strings.  If passed a function, just returns that
       * function.
       * @private
       */
      _coerceFilter: function (filter) {
        // if we have a non-function filter, coerce to an array,
        // then convert that array to a function
        if (typeof filter == 'string') {
          filter = [filter]
        }
        if (dojo.isArray(filter)) {
          filter = function (store, facetName) {
            return array.some(filter, function (fn) {
              return facetName == fn
            })
          }
        }
        return filter
      },

      /**
       * Call the given callback if none of the given event suppression flags are set.
       * @private
       */
      _ifNotSuppressed: function (suppressFlags, callback) {
        if (typeof suppressFlags == 'string') {
          suppressFlags = [suppressFlags]
        }
        if (!this.suppress) {
          this.suppress = {}
        }
        if (
          array.some(
            suppressFlags,
            function (f) {
              return this.suppress[f]
            },
            this,
          )
        ) {
          return undefined
        }
        return callback.call(this)
      },

      /**
       * Call the given callback while setting the given event suppression flags.
       * @private
       */
      _suppress: function (suppressFlags, callback) {
        if (typeof suppressFlags == 'string') {
          suppressFlags = [suppressFlags]
        }
        if (!this.suppress) {
          this.suppress = {}
        }
        dojo.forEach(
          suppressFlags,
          function (f) {
            this.suppress[f] = true
          },
          this,
        )
        var retval = callback.call(this)
        dojo.forEach(
          suppressFlags,
          function (f) {
            this.suppress[f] = false
          },
          this,
        )
        return retval
      },

      _suppressAsync: function (suppressFlags, callback) {
        if (typeof suppressFlags == 'string') {
          suppressFlags = [suppressFlags]
        }
        if (!this.suppress) {
          this.suppress = {}
        }
        dojo.forEach(
          suppressFlags,
          function (f) {
            this.suppress[f] = true
          },
          this,
        )
        return callback.call(this).then(
          retval => {
            suppressFlags.forEach(f => (this.suppress[f] = false))
            return retval
          },
          err => {
            suppressFlags.forEach(f => (this.suppress[f] = false))
            console.error(err)
          },
        )
      },

      /**
       * Call a method of our object such that it cannot call itself
       * by way of event cycles.
       * @private
       */
      _suppressRecursion: function (methodName) {
        var flag = [`method_${methodName}`]
        var method = this[methodName]
        return this._ifNotSuppressed(flag, function () {
          this._suppress(flag, method)
        })
      },

      renderInitial: function () {
        this.containerElem = dojo.create(
          'div',
          {
            id: 'faceted_tracksel',
            className: 'jbrowse',
            style: {
              left: '-95%',
              width: '95%',
              zIndex: 500,
            },
          },
          document.body,
        )

        // make the tab that turns the selector on and off
        dojo.create(
          'div',
          {
            className: 'faceted_tracksel_on_off tab',
            // eslint-disable-next-line xss/no-mixed-html
            innerHTML: dompurify.sanitize(
              `<img src="${this.browser.resolveUrl('img/left_arrow.png')}"><div>Select<br>tracks</div>`,
            ),
          },
          this.containerElem,
        )
        this.mainContainer = new dijit.layout.BorderContainer(
          { design: 'headline', gutters: false },
          dojo.create(
            'div',
            {
              className: 'mainContainer',
            },
            this.containerElem,
          ),
        )

        this.topPane = new dijit.layout.ContentPane({
          region: 'top',
          id: 'faceted_tracksel_top',
          // eslint-disable-next-line xss/no-mixed-html
          content: dompurify.sanitize(
            '<div class="title">Select Tracks</div> ' +
              '<div class="topLink" style="cursor: help"><a title="Track selector help">Help</a></div>',
          ),
        })
        dojo
          .query(
            'div.topLink a[title="Track selector help"]',
            this.topPane.domNode,
          )
          .forEach(function (helplink) {
            var helpdialog = new dijit.Dialog({
              class: 'jbrowse help_dialog',
              refocus: false,
              draggable: false,
              title: 'Track Selection',
              // eslint-disable-next-line xss/no-mixed-html
              content: dompurify.sanitize(
                '<div class="main">' +
                  '<p>The JBrowse Faceted Track Selector makes it easy to search through' +
                  ' large numbers of available tracks to find exactly the ones you want.' +
                  ' You can incrementally filter the track display to narrow it down to' +
                  ' those your are interested in.  There are two types of filtering available,' +
                  ' which can be used together:' +
                  ' <b>filtering with data fields</b>, and free-form <b>filtering with text</b>.' +
                  '</p>' +
                  '  <dl><dt>Filtering with Data Fields</dt>' +
                  '  <dd>The left column of the display contains the available <b>data fields</b>.  Click on the data field name to expand it, and then select one or more values for that field.  This narrows the search to display only tracks that have one of those values for that field.  You can do this for any number of fields.<dd>' +
                  '  <dt>Filtering with Text</dt>' +
                  '  <dd>Type text in the "Contains text" box to filter for tracks whose data contains that text.  If you type multiple words, tracks are filtered such that they must contain all of those words, in any order.  Placing "quotation marks" around the text filters for tracks that contain that phrase exactly.  All text matching is case insensitive.</dd>' +
                  '  <dt>Activating Tracks</dt>' +
                  '  <dd>To activate and deactivate a track, click its check-box in the left-most column.  When the box contains a check mark, the track is activated.  You can also turn whole groups of tracks on and off using the check-box in the table heading.</dd>' +
                  '  </dl>' +
                  '</div>',
              ),
            })
            dojo.connect(helplink, 'onclick', this, function (evt) {
              helpdialog.show()
              return false
            })
          }, this)

        this.mainContainer.addChild(this.topPane)

        // make both buttons toggle this track selector
        dojo
          .query('.faceted_tracksel_on_off')
          .onclick(lang.hitch(this, 'toggle'))

        this.centerPane = new dijit.layout.BorderContainer({
          region: 'center',
          class: 'gridPane',
          gutters: false,
        })
        this.mainContainer.addChild(this.centerPane)
        var textFilterContainer = this.renderTextFilter()

        this.busyIndicator = dojo.create(
          'div',
          {
            // eslint-disable-next-line xss/no-mixed-html
            innerHTML: dompurify.sanitize(
              `<img src="${this.browser.resolveUrl('img/spinner.gif')}">`,
            ),
            className: 'busy_indicator',
          },
          this.containerElem,
        )

        this.centerPane.addChild(
          new dijit.layout.ContentPane({
            region: 'top',
            class: 'gridControls',
            content: [
              dojo.create('button', {
                className: 'faceted_tracksel_on_off',
                // eslint-disable-next-line xss/no-mixed-html
                innerHTML: dompurify.sanitize(
                  `<img src="${this.browser.resolveUrl(
                    'img/left_arrow.png',
                  )}"> <div>Back to browser</div>`,
                ),
                onclick: lang.hitch(this, 'hide'),
              }),
              dojo.create('button', {
                className: 'clear_filters',
                // eslint-disable-next-line xss/no-mixed-html
                innerHTML: dompurify.sanitize(
                  `<img src="${this.browser.resolveUrl('img/red_x.png')}">` +
                    `<div>Clear All Filters</div>`,
                ),
                onclick: lang.hitch(this, function (evt) {
                  this._clearTextFilterControl()
                  this._clearAllFacetControls()
                  this._async(function () {
                    this.updateQuery()
                    this._updateFacetCounts()
                  }, this).call()
                }),
              }),
              this.busyIndicator,
              textFilterContainer,
              dojo.create('div', {
                className: 'matching_record_count',
              }),
            ],
          }),
        )
      },
      renderSelectors: function () {
        // make our main components
        var facetContainer = this.renderFacetSelectors()
        // put them in their places in the overall layout of the track selector
        facetContainer.set('region', 'left')
        this.mainContainer.addChild(facetContainer)

        this.dataGrid = this.renderGrid()
        this.dataGrid.set('region', 'center')

        // code around a dijit bug with width calculation in IE.
        // doesn't seem to harm other browsers, the width gets overwritten anyway
        // by dijit's calculations.
        this.dataGrid.domNode.style.width = '500px'

        this.centerPane.addChild(this.dataGrid)

        this.mainContainer.startup()
        this.gridReady.resolve()
      },

      /** do something in a timeout to avoid blocking the UI */
      _async: function (func, scope) {
        var that = this
        return function () {
          var args = arguments
          var nativeScope = this
          that._busy(true)
          window.setTimeout(function () {
            func.apply(scope || nativeScope, args)
            that._busy(false)
          }, 50)
        }
      },

      _busy: function (busy) {
        this.busyCount = Math.max(0, (this.busyCount || 0) + (busy ? 1 : -1))
        if (this.busyCount > 0) {
          dojo.addClass(this.containerElem, 'busy')
        } else {
          dojo.removeClass(this.containerElem, 'busy')
        }
      },

      renderGrid: function () {
        var displayColumns =
          this.displayColumns ||
          dojo.filter(
            this.trackDataStore.getFacetNames(),
            lang.hitch(this, '_isDisplayableColumn'),
          )

        var colWidth = 90 / displayColumns.length

        var grid = new EnhancedGrid({
          id: 'trackSelectGrid',
          store: this.trackDataStore,
          selectable: true,
          noDataMessage: 'No tracks match the filtering criteria.',
          structure: [
            dojo.map(
              displayColumns,
              function (facetName) {
                // rename name to key to avoid configuration confusion
                facetName =
                  { name: 'key' }[facetName.toLowerCase()] || facetName
                return {
                  name: this._facetDisplayName(facetName),
                  field: facetName.toLowerCase(),
                  width: `${colWidth}%`,
                }
              },
              this,
            ),
          ],
          plugins: {
            indirectSelection: {
              headerSelector: true,
            },
          },
        })

        // set the grid's initial sort index
        var sortIndex = this.config.initialSortColumn || 0
        if (typeof sortIndex == 'string') {
          sortIndex = array.indexOf(displayColumns, sortIndex)
        }
        grid.setSortIndex(sortIndex + 1)

        // monkey-patch the grid to customize some of its behaviors
        this._monkeyPatchGrid(grid)

        return grid
      },

      /**
       * Given a raw facet name, format it for user-facing display.
       * @private
       */
      _facetDisplayName: function (facetName) {
        // make renameFacets if needed, and lowercase all the keys to
        // make it case-insensitive
        this.renameFacets =
          this.renameFacets ||
          function () {
            var renameFacets = this.config.renameFacets
            var lc = {}
            for (var k in renameFacets) {
              lc[k.toLowerCase()] = renameFacets[k]
            }
            lc.key = lc.key || 'Name'
            return lc
          }.call(this)

        return (
          this.renameFacets[facetName.toLowerCase()] ||
          Util.ucFirst(facetName.replace('_', ' '))
        )
      },

      /**
       * Apply several run-time patches to the dojox.grid.EnhancedGrid
       * code to fix bugs and customize the behavior in ways that aren't
       * quite possible using the regular Dojo APIs.
       * @private
       */
      _monkeyPatchGrid: function (grid) {
        // 1. monkey-patch the grid's onRowClick handler to not do
        // anything.  without this, clicking on a row selects it, and
        // deselects everything else, which is quite undesirable.
        grid.onRowClick = function () {}

        // 2. monkey-patch the grid's range-selector to refuse to select
        // if the selection is too big
        var origSelectRange = grid.selection.selectRange
        grid.selection.selectRange = function (inFrom, inTo) {
          var selectionLimit = 30
          if (inTo - inFrom > selectionLimit) {
            alert(
              `Too many tracks selected, please select fewer than ${
                selectionLimit
              } tracks. Note: you can use shift+click to select a range of tracks`,
            )
            return undefined
          }
          return origSelectRange.apply(this, arguments)
        }
      },

      renderTextFilter: function (parent) {
        // make the text input for text filtering
        this.textFilterLabel = dojo.create(
          'label',
          {
            className: 'textFilterControl',
            innerHTML: 'Contains text ',
            id: 'tracklist_textfilter',
            style: {
              position: 'relative',
            },
          },
          parent,
        )
        this.textFilterInput = dojo.create(
          'input',
          {
            type: 'text',
            size: 40,
            disabled: true, // disabled until shown
            onkeypress: lang.hitch(this, function (evt) {
              // don't pay attention to modifier keys
              if (
                evt.keyCode == dojo.keys.SHIFT ||
                evt.keyCode == dojo.keys.CTRL ||
                evt.keyCode == dojo.keys.ALT
              ) {
                return
              }

              // use a timeout to avoid updating the display too fast
              if (this.textFilterTimeout) {
                window.clearTimeout(this.textFilterTimeout)
              }
              this.textFilterTimeout = window.setTimeout(
                lang.hitch(this, function () {
                  // do a new search and update the display
                  this._updateTextFilterControl()
                  this._async(function () {
                    this.updateQuery()
                    this._updateFacetCounts()
                    this.textFilterInput.focus()
                  }, this).call()
                  this.textFilterInput.focus()
                }),
                500,
              )
              this._updateTextFilterControl()

              evt.stopPropagation()
            }),
          },
          this.textFilterLabel,
        )
        // make a "clear" button for the text filtering input
        this.textFilterClearButton = dojo.create(
          'img',
          {
            src: this.browser.resolveUrl('img/red_x.png'),
            className: 'text_filter_clear',
            onclick: lang.hitch(this, function () {
              this._clearTextFilterControl()
              this._async(function () {
                this.updateQuery()
                this._updateFacetCounts()
              }, this).call()
            }),
            style: {
              position: 'absolute',
              right: '4px',
              top: '20%',
            },
          },
          this.textFilterLabel,
        )

        return this.textFilterLabel
      },

      /**
       * Clear the text filter control input.
       * @private
       */
      _clearTextFilterControl: function () {
        this.textFilterInput.value = ''
        this._updateTextFilterControl()
      },
      /**
       * Update the display of the text filter control based on whether
       * it has any text in it.
       * @private
       */
      _updateTextFilterControl: function () {
        if (this.textFilterInput.value.length) {
          dojo.addClass(this.textFilterLabel, 'selected')
        } else {
          dojo.removeClass(this.textFilterLabel, 'selected')
        }
      },

      /**
       * Create selection boxes for each searchable facet.
       */
      renderFacetSelectors: function () {
        var container = new ContentPane({ style: 'width: 200px' })

        var store = this.trackDataStore
        this.facetSelectors = {}

        // render a facet selector for a pseudo-facet holding
        // attributes regarding the tracks the user has been working
        // with
        var usageFacet = this._renderFacetSelector('My Tracks', [
          'Currently Active',
          'Recently Used',
        ])
        usageFacet.set('class', 'myTracks')
        container.addChild(usageFacet)

        // for the facets from the store, only render facet selectors
        // for ones that are not identity attributes, and have an
        // average bucket size greater than 1
        var selectableFacets = dojo.filter(
          this.config.selectableFacets || store.getFacetNames(),
          function (facetName) {
            return this._isSelectableFacet(facetName, this.trackDataStore)
          },
          this,
        )

        dojo.forEach(
          selectableFacets,
          function (facetName) {
            // get the values of this facet
            var values = store.getFacetValues(facetName).sort()
            if (!values || !values.length) {
              return
            }

            var facetPane = this._renderFacetSelector(facetName, values)
            container.addChild(facetPane)
          },
          this,
        )

        return container
      },

      /**
       * Make HTML elements for a single facet selector.
       * @private
       * @returns {dijit.layout.TitlePane}
       */
      _renderFacetSelector: function (
        /**String*/ facetName,
        /**Array[String]*/ values,
      ) {
        var facetPane = new TitlePane({
          title:
            `<span id="facet_title_${facetName}" ` +
            `class="facetTitle">${this._facetDisplayName(
              facetName,
            )} <a class="clearFacet"><img src="${this.browser.resolveUrl(
              'img/red_x.png',
            )}" /></a>` +
            `</span>`,
        })

        // make a selection control for the values of this facet
        var facetControl = dojo.create(
          'table',
          {
            className: 'facetSelect',
          },
          facetPane.containerNode,
        )
        // populate selector's options
        this.facetSelectors[facetName] = dojo.map(
          values,
          function (val) {
            var that = this
            var node = dojo.create(
              'tr',
              {
                className: 'facetValue',
                // eslint-disable-next-line  xss/no-mixed-html
                innerHTML: dompurify.sanitize(
                  `<td class="count"></td><td class="value">${val}</td>`,
                ),
                onclick: function (evt) {
                  dojo.toggleClass(this, 'selected')
                  that._updateFacetControl(facetName)
                  that
                    ._async(function () {
                      that.updateQuery()
                      that._updateFacetCounts(facetName)
                    })
                    .call()
                },
              },
              facetControl,
            )
            node.facetValue = val
            return node
          },
          this,
        )

        return facetPane
      },

      /**
       * Clear all the selections from all of the facet controls.
       * @private
       */
      _clearAllFacetControls: function () {
        dojo.forEach(
          dojof.keys(this.facetSelectors),
          function (facetName) {
            this._clearFacetControl(facetName)
          },
          this,
        )
      },

      /**
       * Clear all the selections from the facet control with the given name.
       * @private
       */
      _clearFacetControl: function (facetName) {
        dojo.forEach(
          this.facetSelectors[facetName] || [],
          function (selector) {
            dojo.removeClass(selector, 'selected')
          },
          this,
        )
        this._updateFacetControl(facetName)
      },

      /**
       * Incrementally update the facet counts as facet values are selected.
       * @private
       */
      _updateFacetCounts: function (/**String*/ skipFacetName) {
        dojo.forEach(
          dojof.keys(this.facetSelectors),
          function (facetName) {
            if (facetName == 'My Tracks') {
              return
            }
            var thisFacetCounts = this.trackDataStore.getFacetCounts(facetName)
            dojo.forEach(
              this.facetSelectors[facetName] || [],
              function (selectorNode) {
                dojo.query('.count', selectorNode).forEach(function (
                  countNode,
                ) {
                  var count = thisFacetCounts
                    ? thisFacetCounts[selectorNode.facetValue] || 0
                    : 0
                  // eslint-disable-next-line  xss/no-mixed-html
                  countNode.innerHTML = dompurify.sanitize(
                    Util.addCommas(count),
                  )
                  if (count) {
                    dojo.removeClass(selectorNode, 'disabled')
                  } else {
                    dojo.addClass(selectorNode, 'disabled')
                  }
                }, this)
                //dojo.removeClass(selector,'selected');
              },
              this,
            )
            this._updateFacetControl(facetName)
          },
          this,
        )
      },

      /**
       * Update the title bar of the given facet control to reflect
       * whether it has selected values in it.
       */
      _updateFacetControl: function (facetName) {
        var titleContent = dojo.byId(`facet_title_${facetName}`)

        // if all our values are disabled, add 'disabled' to our
        // title's CSS classes
        if (
          array.every(
            this.facetSelectors[facetName] || [],
            function (sel) {
              return dojo.hasClass(sel, 'disabled')
            },
            this,
          )
        ) {
          dojo.addClass(titleContent, 'disabled')
        }

        // if we have some selected values, make a "clear" button, and
        // add 'selected' to our title's CSS classes
        if (
          array.some(
            this.facetSelectors[facetName] || [],
            function (sel) {
              return dojo.hasClass(sel, 'selected')
            },
            this,
          )
        ) {
          var clearFunc = lang.hitch(this, function (evt) {
            this._clearFacetControl(facetName)
            this._async(function () {
              this.updateQuery()
              this._updateFacetCounts(facetName)
            }, this).call()
            evt.stopPropagation()
          })
          dojo.addClass(titleContent.parentNode.parentNode, 'activeFacet')
          dojo
            .query('> a', titleContent)
            .forEach(function (node) {
              node.onclick = clearFunc
            }, this)
            .attr('title', 'clear selections')
        }
        // otherwise, no selected values
        else {
          dojo.removeClass(titleContent.parentNode.parentNode, 'activeFacet')
          dojo
            .query('> a', titleContent)
            .onclick(function () {
              return false
            })
            .removeAttr('title')
        }
      },

      /**
       * Update the query we are using with the track metadata store
       * based on the values of the search form elements.
       */
      updateQuery: function () {
        this._suppressRecursion('_updateQuery')
      },
      _updateQuery: function () {
        var newQuery = {}

        var is_selected = function (node) {
          return dojo.hasClass(node, 'selected')
        }

        // update from the My Tracks pseudofacet
        ;(function () {
          var mytracks_options = this.facetSelectors['My Tracks']

          // index the optoins by name
          var byname = {}
          dojo.forEach(mytracks_options, function (opt) {
            byname[opt.facetValue] = opt
          })

          // if filtering for active tracks, add the labels for the
          // currently selected tracks to the query
          if (is_selected(byname['Currently Active'])) {
            var activeTrackLabels = dojof.keys(this.tracksActive || {})
            newQuery.label = Util.uniq(
              (newQuery.label || []).concat(activeTrackLabels),
            )
          }

          // if filtering for recently used tracks, add the labels of recently used tracks
          if (is_selected(byname['Recently Used'])) {
            var recentlyUsed = dojo.map(
              this.browser.getRecentlyUsedTracks(),
              function (t) {
                return t.label
              },
            )

            newQuery.label = Util.uniq(
              (newQuery.label || []).concat(recentlyUsed),
            )
          }

          // finally, if something is selected in here, but we have
          // not come up with any track labels, then insert a dummy
          // track label value that will never match, because the
          // query engine ignores empty arrayrefs.
          if (
            (!newQuery.label || !newQuery.label.length) &&
            array.some(mytracks_options, is_selected)
          ) {
            newQuery.label = [
              'FAKE LABEL THAT IS HIGHLY UNLIKELY TO EVER MATCH ANYTHING',
            ]
          }
        }).call(this)

        // update from the text filter
        if (this.textFilterInput.value.length) {
          newQuery.text = this.textFilterInput.value
        }

        // update from the data-based facet selectors
        dojo.forEach(
          this.trackDataStore.getFacetNames(),
          function (facetName) {
            var options = this.facetSelectors[facetName]
            if (!options) {
              return
            }

            var selectedFacets = dojo.map(
              dojo.filter(options, is_selected),
              function (opt) {
                return opt.facetValue
              },
            )
            if (selectedFacets.length) {
              newQuery[facetName] = selectedFacets
            }
          },
          this,
        )

        this.query = newQuery
        this.dataGrid.setQuery(this.query)
        this._updateMatchCount()
      },

      /**
       * Update the match-count text in the grid controls bar based
       * on the last query that was run against the store.
       * @private
       */
      _updateMatchCount: function () {
        var count = this.dataGrid.store.getCount()
        dojo
          .query('.matching_record_count', this.containerElem)
          .forEach(function (n) {
            // eslint-disable-next-line  xss/no-mixed-html
            n.innerHTML = dompurify.sanitize(
              `${Util.addCommas(count)} ${
                dojof.keys(this.query || {}).length ? 'matching ' : ''
              }track${count == 1 ? '' : 's'}`,
            )
          }, this)
      },

      /**
       * Update the grid to have only rows checked that correspond to
       * tracks that are currently active.
       * @private
       */
      _updateGridSelections: function () {
        this.ready.then(() => {
          // keep selection events from firing while we mess with the
          // grid
          this._ifNotSuppressed(['gridUpdate', 'selectionEvents'], function () {
            this._suppress('selectionEvents', function () {
              this.dataGrid.selection.deselectAll()

              // check the boxes that should be checked, based on our
              // internal memory of what tracks should be on.
              for (
                var i = 0;
                i <
                Math.min(
                  this.dataGrid.get('rowCount'),
                  this.dataGrid.get('rowsPerPage'),
                );
                i++
              ) {
                var item = this.dataGrid.getItem(i)
                if (item) {
                  var label = this.dataGrid.store.getIdentity(item)
                  if (this.tracksActive[label]) {
                    this.dataGrid.rowSelectCell.toggleRow(i, true)
                  }
                }
              }
            })
          })
        })
      },

      /**
       * Given an array of track configs, update the track list to show
       * that they are turned on.
       */
      setTracksActive: function (/**Array[Object]*/ trackConfigs) {
        dojo.forEach(
          trackConfigs,
          function (conf) {
            this.tracksActive[conf.label] = true
          },
          this,
        )
        this._updateGridSelections()
      },

      /**
       * Given an array of track configs, update the track list to show
       * that they are turned off.
       */
      setTracksInactive: function (/**Array[Object]*/ trackConfigs) {
        dojo.forEach(
          trackConfigs,
          function (conf) {
            delete this.tracksActive[conf.label]
          },
          this,
        )
        this._updateGridSelections()
      },

      /**
       * Make the track selector visible.
       */
      show: function () {
        window.setTimeout(
          lang.hitch(this, function () {
            this.textFilterInput.disabled = false
            this.textFilterInput.focus()
          }),
          300,
        )

        dojo.addClass(this.containerElem, 'active')
        dojo
          .animateProperty({
            node: this.containerElem,
            properties: {
              left: {
                start: -95,
                end: 0,
                units: '%',
              },
            },
          })
          .play()

        this.shown = true
      },

      /**
       * Make the track selector invisible.
       */
      hide: function () {
        dojo.removeClass(this.containerElem, 'active')

        dojo
          .animateProperty({
            node: this.containerElem,
            properties: {
              left: {
                start: 0,
                end: -95,
                units: '%',
              },
            },
          })
          .play()

        this.textFilterInput.blur()
        this.textFilterInput.disabled = true

        this.shown = false
      },

      /**
       * Toggle whether the track selector is visible.
       */
      toggle: function () {
        this.shown ? this.hide() : this.show()
      },
    },
  )
})
