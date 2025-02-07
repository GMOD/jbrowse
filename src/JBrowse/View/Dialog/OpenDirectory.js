define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/dom-construct',
  'dijit/focus',
  'dijit/form/TextBox',
  'JBrowse/View/Dialog/WithActionBar',
  'dojo/on',
  'dijit/form/Button',
  'JBrowse/Model/Location',
  'JBrowse/Util',
], function (
  declare,
  array,
  dom,
  focus,
  dijitTextBox,
  ActionBarDialog,
  on,
  Button,
  Location,
  Util,
) {
  return declare(
    ActionBarDialog,

    /**
     * Dijit Dialog subclass that pops up prompt for the user to
     * manually set a new highlight.
     * @lends JBrowse.View.InfoDialog
     */
    {
      autofocus: false,
      title: 'Open directory',

      constructor: function (args) {
        this.browser = args.browser
        this.setCallback = args.setCallback || function () {}
        this.cancelCallback = args.cancelCallback || function () {}
        this.datadir = ''
      },

      _fillActionBar: function (actionBar) {
        var thisB = this
        new Button({
          iconClass: 'dijitIconDelete',
          label: 'Cancel',
          onClick: function () {
            thisB.cancelCallback && thisB.cancelCallback()
            thisB.hide()
          },
        }).placeAt(actionBar)
        new Button({
          iconClass: 'dijitIconFolderOpen',
          label: 'Open',
          onClick: function () {
            thisB.setCallback && thisB.setCallback(thisB.datadir)
            thisB.hide()
          },
        }).placeAt(actionBar)
      },

      show: function (callback) {
        dojo.addClass(this.domNode, 'fileDialog')

        var remoteURLsControl = this._makeRemoteURLsControl()
        var localFilesControl = this._makeLocalFileControl()

        var div = function (attr, children) {
          var d = dom.create('div', attr)
          array.forEach(children, dojo.hitch(d, 'appendChild'))
          return d
        }
        var content = [
          dom.create('div', {
            className: 'intro',
            innerHTML:
              'Select a data directory to load, either from a "track hub" on the web, or from a local folder on your filesystem',
          }),
          div({ className: 'resourceControls' }, [
            localFilesControl.domNode,
            remoteURLsControl.domNode,
          ]),
          dom.create('div', {
            className: 'files',
            id: 'data_dir',
            innerHTML: '<b>Result</b>:<br/><div id="data_dir_list"></div>',
          }),
        ]
        this.set('content', content)
        this.inherited(arguments)
      },

      _makeRemoteURLsControl: function () {
        var container = dom.create('div', {
          className: 'remoteURLsControl',
        })
        var thisB = this

        // make the input elements
        dom.create(
          'h3',
          {
            innerHTML: 'Remote URLs - <smaller>one per line</smaller>',
          },
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
            placeHolder: 'http://jbrowse.org/data_hub',
            cols: 25,
            rows: 5,
            spellcheck: false,
          },
          container,
        )

        on(self.input, 'change', function (here) {
          console.log(self.input.value)
          dojo.byId('data_dir_list').innerHTML = self.input.value
          thisB.datadir = self.input.value
        })
        var checkFrequency = 900
        var checkForChange = function () {
          // compare with all whitespace changed to commas so that
          // we are insensitive to changes in whitespace
          if (self.input.value != thisB.datadir && !thisB.localopened) {
            dojo.byId('data_dir_list').innerHTML = self.input.value
            thisB.datadir = self.input.value
          }
          window.setTimeout(checkForChange, checkFrequency)
        }
        window.setTimeout(checkForChange, checkFrequency)

        return self
      },

      _makeLocalFileControl: function () {
        var container = dom.create('div', {
          className: 'localFilesControl',
          style: { width: '50%' },
        })
        var header = dom.create(
          'h3',
          { innerHTML: 'Local data directories' },
          container,
        )
        var dragArea = dom.create('div', { className: 'dragArea' }, container)
        var fileBox
        if (Util.isElectron()) {
          fileBox = dom.create(
            'input',
            {
              type: 'button',
              value: 'Select directory...',
              id: 'openFile',
            },
            dragArea,
          )
        } else {
          fileBox = new dojox.form.Uploader({
            multiple: true,
          })
          fileBox.placeAt(dragArea)
          if (this.browserSupports.dnd) {
            // let the uploader process any files dragged into the dialog
            fileBox.addDropTarget(this.domNode)

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
        }

        var thisB = this
        on(fileBox, 'click', function () {
          var dialog = electronRequire('electron').remote.dialog
          var ret = dialog.showOpenDialog({
            properties: ['openDirectory'],
          })
          if (ret) {
            var paths = array.map(ret, function (replace) {
              return Util.replacePath(replace)
            })
            thisB.datadir = paths[0]
            thisB.localopened = true
            dojo.byId('data_dir_list').innerHTML = paths[0]
          }
        })

        return { domNode: container }
      },

      hide: function () {
        this.inherited(arguments)
        window.setTimeout(dojo.hitch(this, 'destroyRecursive'), 500)
      },
    },
  )
})
