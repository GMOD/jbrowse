import dompurify from 'dompurify'

define([
  'dojo/_base/declare',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/aspect',
  'dijit/Dialog',
  'dijit/form/Button',
  'dijit/form/TextBox',
  'dijit/focus',
  'JBrowse/View/LocationList',
  'JBrowse/Util',
], function (
  declare,
  dom,
  on,
  aspect,
  Dialog,
  Button,
  TextBox,
  dijitFocus,
  LocationListView,
  Util,
) {
  return declare(null, {
    constructor: function (args) {
      this.browser = args.browser
      this.config = dojo.clone(args.config || {})
      this.locationChoices = [
        {
          label: 'Search results...',
          description: ' ',
          start: 0,
          end: 100,
          ref: 'chr',
        },
      ]
      this.title = args.title || 'Choose location'
      this.prompt = args.prompt || 'Search for features'
      this.goCallback = args.goCallback
      this.showCallback = args.showCallback
    },

    show: function () {
      var dialog = (this.dialog = new Dialog({
        title: this.title,
        className: 'locationChoiceDialog',
        style: { width: '70%' },
      }))
      var container = dom.create('div', {})

      if (this.prompt) {
        dom.create(
          'div',
          {
            className: 'prompt',
            // eslint-disable-next-line xss/no-mixed-html
            innerHTML: dompurify.sanitize(this.prompt),
          },
          container,
        )
        var subcontainer = dojo.create(
          'div',
          { style: { padding: '20px' } },
          container,
        )
        dojo.create(
          'img',
          {
            width: '16px',
            src: 'img/search.png',
            style: { 'padding-right': '5px' },
          },
          subcontainer,
        )
        this.searchBox = new TextBox({
          intermediateChanges: true,
        }).placeAt(subcontainer)
        dojo.create(
          'label',
          {
            style: { marginLeft: '20px' },
            for: 'exact_match',
            innerHTML: 'Exact?',
          },
          subcontainer,
        )
        this.exactCheckbox = dojo.create(
          'input',
          { type: 'checkbox', id: 'exact_match' },
          subcontainer,
        )

        on(this.searchBox, 'change', dojo.hitch(this, 'searchBoxProcess'))
        on(this.exactCheckbox, 'change', dojo.hitch(this, 'searchBoxProcess'))
      }
      var browser = this.browser
      this.locationListView = new LocationListView(
        {
          browser: browser,
          locations: this.locationChoices,
          buttons: [
            {
              className: 'show',
              innerHTML: 'Show',
              onClick:
                this.showCallback ||
                function (location) {
                  browser.showRegionAfterSearch(location)
                },
            },
            {
              className: 'go',
              innerHTML: 'Go',
              onClick:
                this.goCallback ||
                function (location) {
                  dialog.hide()
                  browser.showRegionAfterSearch(location)
                },
            },
          ],
        },
        dom.create(
          'div',
          {
            className: 'locationList',
            style: {
              maxHeight: `${0.5 * this.browser.container.offsetHeight}px`,
            },
          },
          container,
        ),
      )

      this.actionBar = dojo.create('div', {
        className: 'infoDialogActionBar dijitDialogPaneActionBar',
      })
      new Button({
        iconClass: 'dijitIconDelete',
        label: 'Cancel',
        onClick: dojo.hitch(dialog, 'hide'),
      }).placeAt(this.actionBar)

      this.numResults = dojo.create(
        'div',
        { id: 'numResults', style: { margin: '10px' } },
        container,
      )
      this.errResults = dojo.create(
        'div',
        { id: 'errResults', style: { margin: '10px', color: 'red' } },
        container,
      )
      dialog.set('content', [container, this.actionBar])

      var g = this.locationListView.grid
      ;(g.store || g.collection).setData([])
      g.refresh()
      dialog.show()

      aspect.after(
        dialog,
        'hide',
        dojo.hitch(this, function () {
          if (dijitFocus.curNode) {
            dijitFocus.curNode.blur()
          }
          setTimeout(function () {
            dialog.destroyRecursive()
          }, 500)
        }),
      )
    },
    searchBoxProcess: function () {
      var loc = this.searchBox.get('value')
      this.numResults.innerHTML = ''
      if (!this.exactCheckbox.checked) {
        loc += '*'
      }
      function handleError(error) {
        console.error(error)
        var g = this.locationListView.grid
        ;(g.store || g.collection).setData([])
        g.refresh()
        this.errResults.innerHTML = 'Error: failed to load results'
        this.numResults.innerHTML = ''
      }
      this.browser.nameStore.query({ name: loc }).then(
        nameMatches => {
          var promises = nameMatches.map(match =>
            this.browser.nameStore.query({ name: match.name }),
          )
          Promise.all(promises).then(
            res => {
              var grid = []
              for (var i = 0; i < res.length; i++) {
                var elt = res[i]
                if (elt.length) {
                  elt = elt[0]
                  if (elt.multipleLocations) {
                    for (var j = 0; j < elt.multipleLocations.length; j++) {
                      var track = elt.multipleLocations[j].tracks.length
                        ? elt.multipleLocations[j].tracks[0]
                        : {}
                      grid.push({
                        locstring: Util.assembleLocString(
                          elt.multipleLocations[j],
                        ),
                        location: elt.multipleLocations[j],
                        label: elt.name,
                        description:
                          track.key || track.label || 'Unknown track',
                        tracks: track,
                      })
                    }
                  } else {
                    var track = (elt.location.tracks || []).length
                      ? elt.location.tracks[0]
                      : {}
                    grid.push({
                      locstring: Util.assembleLocString(elt.location),
                      location: elt.location,
                      label: elt.location.objectName,
                      description: track.key || track.label || 'Unknown track',
                      tracks: track,
                    })
                  }
                }
              }
              this.numResults.innerHTML = `Num. results: ${grid.length}`
              var g = this.locationListView.grid
              ;(g.store || g.collection).setData(grid)
              g.refresh()
              this.errResults.innerHTML = ''
            },
            dojo.hitch(this, handleError),
          )
        },
        dojo.hitch(this, handleError),
      )
    },
  })
})
