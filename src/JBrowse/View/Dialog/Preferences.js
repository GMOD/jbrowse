import dompurify from 'dompurify'

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/dom-construct',
  'JBrowse/View/Dialog/WithActionBar',
  'dojo/on',
  'dijit/form/Button',
  'JBrowse/Util',
], function (declare, array, dom, ActionBarDialog, on, Button, Util) {
  return declare(
    ActionBarDialog,

    /**
     * Dijit Dialog subclass that pops up prompt for the user to
     * manually set a new highlight.
     * @lends JBrowse.View.InfoDialog
     */
    {
      autofocus: false,
      title: 'Open plugin',

      constructor: function (args) {
        this.browser = args.browser
        this.setCallback = args.setCallback || function () {}
        this.cancelCallback = args.cancelCallback || function () {}
        this.plugins = []
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
            thisB.setCallback && thisB.setCallback(thisB.plugins)
            thisB.hide()
          },
        }).placeAt(actionBar)
      },

      show: function (callback) {
        dojo.addClass(this.domNode, 'jbrowse fileDialog')

        var container = dom.create('div', {
          className: 'localFilesControl',
          style: { width: '100%' },
        })
        var dragArea = dom.create('div', { className: 'dragArea' }, container)
        var fileBox
        if (Util.isElectron()) {
          fileBox = dom.create(
            'input',
            {
              type: 'button',
              value: 'Select files...',
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
            thisB.plugins.push(paths[0])
            // eslint-disable-next-line xss/no-mixed-html
            dojo.byId('plugins_list').innerHTML += dompurify.sanitize(
              `${paths}<br/>`,
            )
          }
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
              'Select plugin directories to load. Note: The name of the directory will also be used as the name of the plugin, which is sometimes important for the plugin loader',
          }),
          div(
            {
              className: 'resourceControls',
              style: { width: '100%' },
            },
            [container],
          ),
          dom.create('div', {
            className: 'files',
            id: 'plugins_list',
            innerHTML: 'Plugins:<br/>',
          }),
        ]
        this.set('content', content)
        this.inherited(arguments)
      },

      hide: function () {
        this.inherited(arguments)
        window.setTimeout(dojo.hitch(this, 'destroyRecursive'), 500)
      },
    },
  )
})
