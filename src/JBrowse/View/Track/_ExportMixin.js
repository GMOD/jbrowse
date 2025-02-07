define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/aspect',
  'dojo/on',
  'JBrowse/has',
  'dojo/window',
  'dojo/dom-construct',
  'JBrowse/Util',
  'dijit/form/TextBox',
  'dijit/form/Button',
  'dijit/form/RadioButton',
  'dijit/Dialog',
  'FileSaver/FileSaver',
], function (
  declare,
  array,
  lang,
  aspect,
  on,
  has,
  dojoWindow,
  dom,
  Util,
  dijitTextBox,
  dijitButton,
  dijitRadioButton,
  dijitDialog,
  FileSaver,
) {
  /**
   * Mixin for a track that can export its data.
   * @lends JBrowse.View.Track.ExportMixin
   */
  return declare(null, {
    _canSaveFiles: function () {
      return has('save-generated-files') && !this.config.noExportFiles
    },

    _canExport: function () {
      if (this.config.noExport) {
        return false
      }

      var highlightedRegion = this.browser.getHighlight()
      var visibleRegion = this.browser.view.visibleRegion()
      var wholeRefSeqRegion = {
        ref: this.refSeq.name,
        start: this.refSeq.start,
        end: this.refSeq.end,
      }
      var canExportVisibleRegion = this._canExportRegion(visibleRegion)
      var canExportWholeRef = this._canExportRegion(wholeRefSeqRegion)
      return (
        (highlightedRegion && this._canExportRegion(highlightedRegion)) ||
        this._canExportRegion(visibleRegion) ||
        this._canExportRegion(wholeRefSeqRegion)
      )
    },

    _possibleExportRegions: function () {
      var regions = [
        // the visible region
        function () {
          var r = dojo.clone(this.browser.view.visibleRegion())
          r.description = 'Visible region'
          r.name = 'visible'
          return r
        }.call(this),
        // whole reference sequence
        {
          ref: this.refSeq.name,
          start: this.refSeq.start,
          end: this.refSeq.end,
          description: 'Whole reference sequence',
          name: 'wholeref',
        },
      ]

      var highlightedRegion = this.browser.getHighlight()
      if (highlightedRegion) {
        const { start, end, ref } = highlightedRegion
        regions.unshift({
          start,
          end,
          ref,
          description: 'Highlighted region',
          name: 'highlight',
        })
      }

      return regions
    },

    _exportDialogContent: function () {
      // note that the `this` for this content function is not the track, it's the menu-rendering context
      var possibleRegions = this.track._possibleExportRegions()

      // for each region, calculate its length and determine whether we can export it
      array.forEach(
        possibleRegions,
        function (region) {
          region.length = Math.round(region.end - region.start + 1)
          region.canExport = this._canExportRegion(region)
        },
        this.track,
      )

      var setFilenameValue = dojo.hitch(this.track, function () {
        var region = this._readRadio(form.elements.region)
        var format = nameToExtension[this._readRadio(form.elements.format)]
        form.elements.filename.value =
          ((this.key || this.label) + '-' + region).replace(
            /[^ .a-zA-Z0-9_-]/g,
            '-',
          ) +
          '.' +
          format
      })

      var form = dom.create('form', {
        onSubmit: function () {
          return false
        },
      })
      var regionFieldset = dom.create('fieldset', { className: 'region' }, form)
      dom.create('legend', { innerHTML: 'Region to save' }, regionFieldset)

      var checked = 0
      array.forEach(possibleRegions, function (r) {
        var locstring = Util.assembleLocString(r)
        var regionButton = new dijitRadioButton({
          name: 'region',
          id: 'region_' + r.name,
          value: locstring,
          checked: r.canExport && !checked++ ? 'checked' : '',
        })
        regionFieldset.appendChild(regionButton.domNode)
        var regionButtonLabel = dom.create(
          'label',
          {
            for: regionButton.id,
            innerHTML:
              r.description +
              ' - <span class="locString">' +
              locstring +
              '</span> (' +
              Util.humanReadableNumber(r.length) +
              (r.canExport ? 'b' : 'b, too large') +
              ')',
          },
          regionFieldset,
        )
        if (!r.canExport) {
          regionButton.domNode.disabled = 'disabled'
          regionButtonLabel.className = 'ghosted'
        }

        on(regionButton, 'click', setFilenameValue)

        dom.create('br', {}, regionFieldset)
      })

      var formatFieldset = dom.create('fieldset', { className: 'format' }, form)
      dom.create('legend', { innerHTML: 'Format' }, formatFieldset)

      checked = 0
      var nameToExtension = {}
      array.forEach(
        this.track._exportFormats(),
        function (fmt) {
          if (!fmt.name) {
            fmt = { name: fmt, label: fmt }
          }
          if (!fmt.fileExt) {
            fmt.fileExt = fmt.name || fmt
          }
          nameToExtension[fmt.name] = fmt.fileExt
          var formatButton = new dijitRadioButton({
            name: 'format',
            id: 'format' + fmt.name,
            value: fmt.name,
            checked: checked++ ? '' : 'checked',
          })
          formatFieldset.appendChild(formatButton.domNode)
          var formatButtonLabel = dom.create(
            'label',
            { for: formatButton.id, innerHTML: fmt.label },
            formatFieldset,
          )

          on(formatButton, 'click', setFilenameValue)
          dom.create('br', {}, formatFieldset)
        },
        this,
      )

      var filenameFieldset = dom.create(
        'fieldset',
        { className: 'filename' },
        form,
      )
      dom.create('legend', { innerHTML: 'Filename' }, filenameFieldset)
      dom.create(
        'input',
        { type: 'text', name: 'filename', style: { width: '100%' } },
        filenameFieldset,
      )

      setFilenameValue()

      var actionBar = dom.create('div', {
        className: 'dijitDialogPaneActionBar',
      })

      // note that the `this` for this content function is not the track, it's the menu-rendering context
      var dialog = this.dialog

      new dijitButton({
        iconClass: 'dijitIconDelete',
        onClick: dojo.hitch(dialog, 'hide'),
        label: 'Cancel',
      }).placeAt(actionBar)
      var viewButton = new dijitButton({
        iconClass: 'dijitIconTask',
        label: 'View',
        disabled: !array.some(possibleRegions, function (r) {
          return r.canExport
        }),
        onClick: lang.partial(
          this.track._exportViewButtonClicked,
          this.track,
          form,
          dialog,
        ),
      }).placeAt(actionBar)

      // don't show a download button if we for some reason can't save files
      if (this.track._canSaveFiles()) {
        var dlButton = new dijitButton({
          iconClass: 'dijitIconSave',
          label: 'Save',
          disabled: !array.some(possibleRegions, function (r) {
            return r.canExport
          }),
          onClick: dojo.hitch(this.track, function () {
            var format = this._readRadio(form.elements.format)
            var region = this._readRadio(form.elements.region)
            var filename = form.elements.filename.value.replace(
              /[^ .a-zA-Z0-9_-]/g,
              '-',
            )
            dlButton.set('disabled', true)
            dlButton.set('iconClass', 'jbrowseIconBusy')
            this.exportRegion(
              region,
              format,
              dojo.hitch(this, function (output) {
                dialog.hide()
                this._fileDownload({
                  format: format,
                  data: output,
                  filename: filename,
                })
              }),
            )
          }),
        }).placeAt(actionBar)
      }

      return [form, actionBar]
    },

    // run when the 'View' button is clicked in the export dialog
    _exportViewButtonClicked: function (track, form, dialog) {
      var viewButton = this
      viewButton.set('disabled', true)
      viewButton.set('iconClass', 'jbrowseIconBusy')

      var region = track._readRadio(form.elements.region)
      var format = track._readRadio(form.elements.format)
      var filename = form.elements.filename.value.replace(
        /[^ .a-zA-Z0-9_-]/g,
        '-',
      )
      track.exportRegion(region, format, function (output) {
        dialog.hide()
        var text = dom.create('textarea', {
          rows: Math.round((dojoWindow.getBox().h / 12) * 0.5),
          wrap: 'off',
          cols: 80,
          style:
            'maxWidth: 90em; overflow: scroll; overflow-y: scroll; overflow-x: scroll; overflow:-moz-scrollbars-vertical;',
          readonly: true,
        })
        text.value = output
        var actionBar = dom.create('div', {
          className: 'dijitDialogPaneActionBar',
        })
        var exportView = new dijitDialog({
          className: 'export-view-dialog',
          title:
            format +
            ' export - <span class="locString">' +
            region +
            '</span> (' +
            Util.humanReadableNumber(output.length) +
            'bytes)',
          content: [text, actionBar],
        })
        new dijitButton({
          iconClass: 'dijitIconDelete',
          label: 'Close',
          onClick: dojo.hitch(exportView, 'hide'),
        }).placeAt(actionBar)

        // only show a button if the browser can save files
        if (track._canSaveFiles()) {
          var saveDiv = dom.create('div', { className: 'save' }, actionBar)

          var saveButton = new dijitButton({
            iconClass: 'dijitIconSave',
            label: 'Save',
            onClick: function () {
              var filename = fileNameText
                .get('value')
                .replace(/[^ .a-zA-Z0-9_-]/g, '-')
              exportView.hide()
              track._fileDownload({
                format: format,
                data: output,
                filename: filename,
              })
            },
          }).placeAt(saveDiv)
          var fileNameText = new dijitTextBox({
            value: filename,
            style: 'width: 24em',
          }).placeAt(saveDiv)
        }

        aspect.after(exportView, 'hide', function () {
          // manually unhook and free the (possibly huge) text area
          text.parentNode.removeChild(text)
          text = null
          setTimeout(function () {
            exportView.destroyRecursive()
          }, 500)
        })
        exportView.show()
      })
    },

    _fileDownload: function (args) {
      FileSaver.saveAs(
        new Blob([args.data], {
          type: args.format
            ? 'application/x-' + args.format.toLowerCase()
            : 'text/plain',
        }),
        args.filename,
      )
      // We will need to check whether this breaks the WebApollo plugin.
    },

    // cross-platform function for (portably) reading the value of a radio control. sigh. *rolls eyes*
    _readRadio: function (r) {
      if (r.length) {
        for (var i = 0; i < r.length; i++) {
          if (r[i].checked) {
            return r[i].value
          }
        }
      }
      return r.value
    },

    exportRegion: function (region, format, callback) {
      // parse the locstring if necessary
      if (typeof region == 'string') {
        region = Util.parseLocString(region)
      }

      // we can only export from the currently-visible reference
      // sequence right now
      if (region.ref != this.refSeq.name) {
        console.error(
          'cannot export data for ref seq ' +
            region.ref +
            ', ' +
            'exporting is currently only supported for the ' +
            'currently-visible reference sequence',
        )
        return
      }

      dojo.global.require(
        [format.match(/\//) ? format : 'JBrowse/View/Export/' + format],
        dojo.hitch(this, function (exportDriver) {
          new exportDriver({
            refSeq: this.refSeq,
            track: this,
            store: this.store,
          }).exportRegion(region, callback)
        }),
      )
    },

    _trackMenuOptions: function () {
      var opts = this.inherited(arguments)

      if (!this.config.noExport) {
        // add a "Save track data as" option to the track menu
        opts.push({
          label: 'Save track data',
          iconClass: 'dijitIconSave',
          disabled: !this._canExport(),
          action: 'bareDialog',
          content: this._exportDialogContent,
          dialog: { id: 'exportDialog', className: 'export-dialog' },
        })
      }

      return opts
    },

    _canExportRegion: function (l) {
      //console.log('can generic export?');
      if (!l) {
        return false
      }

      // if we have a maxExportSpan configured for this track, use it.
      if (
        typeof this.config.maxExportSpan == 'number' ||
        typeof this.config.maxExportSpan == 'string'
      ) {
        return l.end - l.start + 1 <= this.config.maxExportSpan
      } else {
        // if we know the store's feature density, then use that with
        // a limit of maxExportFeatures or 5,000 features
        var thisB = this
        var storeStats = {}
        // will return immediately if the stats are available
        this.store.getGlobalStats(
          function (s) {
            storeStats = s
          },
          function (error) {},
        ) // error callback does nothing for now
        if (storeStats.featureDensity) {
          return (
            storeStats.featureDensity * (l.end - l.start) <=
            (thisB.config.maxExportFeatures || 50000)
          )
        }
      }

      // otherwise, i guess we can export
      return true
    },
  })
})
