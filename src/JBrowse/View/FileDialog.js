define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/aspect',
  'dojo/on',
  'dijit/focus',
  'dijit/form/Button',
  'dijit/form/RadioButton',
  'dojo/dom-construct',
  'dijit/Dialog',
  'dojox/form/Uploader',
  './FileDialog/TrackList/BAMDriver',
  './FileDialog/TrackList/CRAMDriver',
  './FileDialog/TrackList/BigWigDriver',
  './FileDialog/TrackList/GFF3Driver',
  './FileDialog/TrackList/GTFDriver',
  './FileDialog/TrackList/VCFTabixDriver',
  './FileDialog/TrackList/VCFTribbleDriver',
  './FileDialog/TrackList/BEDTabixDriver',
  './FileDialog/TrackList/GFF3TabixDriver',
  './FileDialog/TrackList/BEDDriver',
  './FileDialog/TrackList/BigBedDriver',
  './FileDialog/ResourceList',
  './FileDialog/TrackList',
  'JBrowse/Util',
], function (
  declare,
  array,
  aspect,
  on,
  dijitFocus,
  Button,
  RadioButton,
  dom,
  Dialog,
  Uploaded,
  BAMDriver,
  CRAMDriver,
  BigWigDriver,
  GFF3Driver,
  GTFDriver,
  VCFTabixDriver,
  VCFTribbleDriver,
  BEDTabixDriver,
  GFF3TabixDriver,
  BEDDriver,
  BigBedDriver,
  ResourceList,
  TrackList,
  Util,
) {
  return declare(null, {
    constructor: function (args) {
      this.browser = args.browser
      this.config = dojo.clone(args.config || {})
      this.browserSupports = {
        dnd: 'draggable' in document.createElement('span'),
      }

      this._fileTypeDrivers = [
        new BAMDriver(),
        new CRAMDriver(),
        new BigWigDriver(),
        new GFF3Driver(),
        new GTFDriver(),
        new VCFTabixDriver(),
        new VCFTribbleDriver(),
        new BEDTabixDriver(),
        new GFF3TabixDriver(),
        new BEDDriver(),
        new BigBedDriver(),
      ]
    },

    addFileTypeDriver: function (d) {
      this._fileTypeDrivers.unshift(d)
    },
    getFileTypeDrivers: function () {
      return this._fileTypeDrivers.slice()
    },

    _makeActionBar: function (openCallback, cancelCallback) {
      var actionBar = dom.create('div', {
        className: 'dijitDialogPaneActionBar',
      })

      var disChoices = (this.trackDispositionChoice = [
        new RadioButton({
          id: 'openImmediately',
          value: 'openImmediately',
          checked: true,
        }),
        new RadioButton({
          id: 'addToTrackList',
          value: 'addToTrackList',
        }),
      ])

      var aux = dom.create('div', { className: 'aux' }, actionBar)
      disChoices[0].placeAt(aux)
      dom.create(
        'label',
        { for: 'openImmediately', innerHTML: 'Open immediately' },
        aux,
      ),
        disChoices[1].placeAt(aux)
      dom.create(
        'label',
        { for: 'addToTrackList', innerHTML: 'Add to tracks' },
        aux,
      )

      new Button({
        iconClass: 'dijitIconDelete',
        label: 'Cancel',
        onClick: dojo.hitch(this, function () {
          cancelCallback && cancelCallback()
          this.dialog.hide()
        }),
      }).placeAt(actionBar)
      new Button({
        iconClass: 'dijitIconFolderOpen',
        label: 'Open',
        onClick: dojo.hitch(this, function () {
          openCallback &&
            openCallback({
              trackConfs: this.trackList.getTrackConfigurations(),
              trackDisposition: this.trackDispositionChoice[0].checked
                ? this.trackDispositionChoice[0].value
                : this.trackDispositionChoice[1].checked
                  ? this.trackDispositionChoice[1].value
                  : undefined,
            })
          this.dialog.hide()
        }),
      }).placeAt(actionBar)

      return { domNode: actionBar }
    },

    show: function (args) {
      var dialog = (this.dialog = new Dialog({
        title: 'Open files',
        className: 'fileDialog',
      }))

      var localFilesControl = this._makeLocalFilesControl()
      var remoteURLsControl = this._makeRemoteURLsControl()
      var resourceListControl = this._makeResourceListControl()
      var trackListControl = this._makeTrackListControl()
      var actionBar = this._makeActionBar(
        args.openCallback,
        args.cancelCallback,
      )

      // connect the local files control to the resource list
      dojo.connect(localFilesControl.uploader, 'onChange', function () {
        if (Util.isElectron()) {
          const arr = [...localFilesControl.uploader._files].map(file =>
            Util.replacePath(file.path),
          )
          resourceListControl.addURLs(arr)
        } else {
          resourceListControl.addLocalFiles(localFilesControl.uploader._files)
        }
      })

      // connect the remote URLs control to the resource list
      dojo.connect(remoteURLsControl, 'onChange', function (urls) {
        resourceListControl.clearURLs()
        resourceListControl.addURLs(urls)
      })

      // connect the resource list to the track list
      dojo.connect(resourceListControl, 'onChange', function (resources) {
        trackListControl.update(resources)
      })

      var div = function (attr, children) {
        var d = dom.create('div', attr)
        array.forEach(children, dojo.hitch(d, 'appendChild'))
        return d
      }
      var content = [
        dom.create('div', {
          className: 'intro',
          innerHTML:
            args.introMsg ||
            'Add any combination of data files and URLs, and JBrowse will automatically suggest tracks to display their contents.',
        }),
        div({ className: 'resourceControls' }, [
          localFilesControl.domNode,
          remoteURLsControl.domNode,
        ]),
        resourceListControl.domNode,
        trackListControl.domNode,
        actionBar.domNode,
      ]
      dialog.set('content', content)
      dialog.show()

      aspect.after(
        dialog,
        'hide',
        dojo.hitch(this, function () {
          dijitFocus.curNode && dijitFocus.curNode.blur()
          setTimeout(function () {
            dialog.destroyRecursive()
          }, 500)
        }),
      )
    },

    _makeLocalFilesControl: function () {
      var container = dom.create('div', {
        className: 'localFilesControl',
      })

      dom.create('h3', { innerHTML: 'Local files' }, container)

      var dragArea = dom.create('div', { className: 'dragArea' }, container)
      var fileBox

      fileBox = new dojox.form.Uploader({
        multiple: true,
      })
      fileBox.placeAt(dragArea)
      if (this.browserSupports.dnd) {
        // let the uploader process any files dragged into the dialog
        fileBox.addDropTarget(this.dialog.domNode)

        // add a message saying you can drag files in
        dom.create(
          'div',
          {
            className: 'dragMessage',
            innerHTML: 'Select or drag files here.',
          },
          dragArea,
        )
      }

      // little elements used to show pipeline-like connections between the controls
      dom.create(
        'div',
        { className: 'connector', innerHTML: '&nbsp;' },
        container,
      )

      return { domNode: container, uploader: fileBox }
    },

    _makeRemoteURLsControl: function () {
      var container = dom.create('div', {
        className: 'remoteURLsControl',
      })

      // make the input elements
      dom.create(
        'h3',
        { innerHTML: 'Remote URLs - <smaller>one per line</smaller>' },
        container,
      )

      // the onChange here will be connected to by the other parts
      // of the dialog to propagate changes to the text in the box
      var self = {
        domNode: container,
        onChange: function (urls) {
          //console.log('urls changed');
        },
      }
      self.input = dom.create(
        'textarea',
        {
          className: 'urlInput',
          placeHolder: 'http://paste.urls.here/example.bam',
          cols: 25,
          rows: 5,
          spellcheck: false,
        },
        container,
      )

      // set up the handlers to propagate changes
      var realChange = function () {
        var text = dojo.trim(self.input.value)
        var urls = text.length ? text.split(/\s+/) : []
        self.onChange(urls)
      }
      // watch the input text for changes.  just do it every 900ms
      // because there are many ways that text can get changed (like
      // pasting), not all of which fire the same events.  not using
      // the onchange event, because that doesn't fire until the
      // textarea loses focus.
      var previousText = ''
      var checkFrequency = 900
      var checkForChange = function () {
        // compare with all whitespace changed to commas so that
        // we are insensitive to changes in whitespace
        if (self.input.value.replace(/\s+/g, ',') != previousText) {
          realChange()
          previousText = self.input.value.replace(/\s+/g, ',')
        }
        window.setTimeout(checkForChange, checkFrequency)
      }
      window.setTimeout(checkForChange, checkFrequency)

      // little elements used to show pipeline-like connections between the controls
      dom.create(
        'div',
        { className: 'connector', innerHTML: '&nbsp;' },
        container,
      )

      return self
    },

    _makeResourceListControl: function () {
      var rl = new ResourceList({ dialog: this })
      return rl
    },
    _makeTrackListControl: function () {
      var tl = new TrackList({ browser: this.browser, fileDialog: this })
      this.trackList = tl
      return tl
    },
  })
})
