/**
 * Pops up a dialog to edit the configuration of a single track.
 */
define([
  'dojo/_base/declare',
  'dojo/aspect',
  'dojo/json',
  'dojo/on',
  'dojo/dom-construct',
  'dijit/Dialog',
  'dijit/form/Button',
], function (declare, aspect, JSON, on, dom, Dialog, Button) {
  return declare(null, {
    constructor: function (trackConfig) {
      this.trackConfig = trackConfig
    },

    _makeActionBar: function (editCallback, cancelCallback) {
      var actionBar = dom.create('div', {
        className: 'dijitDialogPaneActionBar',
      })

      new Button({
        iconClass: 'dijitIconDelete',
        label: 'Cancel',
        onClick: dojo.hitch(this, function () {
          cancelCallback && cancelCallback()
          this.dialog.hide()
        }),
      }).placeAt(actionBar)
      this.applyButton = new Button({
        iconClass: 'dijitIconEdit',
        label: 'Apply',
        onClick: dojo.hitch(this, function () {
          if (this.newConfig) {
            editCallback &&
              editCallback({
                conf: this.newConfig,
              })
          } else {
            cancelCallback && cancelCallback()
          }
          this.dialog.hide()
        }),
      })
      this.applyButton.placeAt(actionBar)

      return { domNode: actionBar }
    },

    show: function (editCallback, cancelCallback) {
      var dialog = (this.dialog = new Dialog({
        title: 'Edit track configuration',
        className: 'trackConfigEditor',
      }))

      var content = [
        this._makeEditControls().domNode,
        this._makeActionBar(editCallback, cancelCallback).domNode,
      ]
      dialog.set('content', content)
      dialog.show()

      aspect.after(
        dialog,
        'hide',
        dojo.hitch(this, function () {
          setTimeout(function () {
            dialog.destroyRecursive()
          }, 500)
        }),
      )
    },

    _makeEditControls: function () {
      var realChange = dojo.hitch(this, function () {
        this.newConfig = this._parseNewConfig(textArea.value)
      })

      var container = dom.create('div', { className: 'editControls' })

      var confString = this._stringifyConfig(this.trackConfig)
      var textArea = dom.create(
        'textarea',
        {
          rows: Math.min((confString || '').match(/\n/g).length + 4, 20),
          cols: 70,
          value: confString,
          spellcheck: false,
          onchange: realChange,
        },
        container,
      )
      // watch the input text for changes.  just do it every 700ms
      // because there are many ways that text can get changed (like
      // pasting), not all of which fire the same events.  not using
      // the onchange event, because that doesn't fire until the
      // textarea loses focus.
      var previousText = ''
      var checkFrequency = 700
      var that = this
      var checkForChange = function () {
        if (that.dialog.get('open')) {
          if (textArea.value != previousText) {
            realChange()
            previousText = textArea.value
          }
          // TODO: do not renew this timeout if the dialog is destroyed
          window.setTimeout(checkForChange, checkFrequency)
        }
      }
      window.setTimeout(checkForChange, checkFrequency)

      var errorArea = dom.create('div', { className: 'errors' }, container)
      this.errorReportArea = errorArea

      return { domNode: container }
    },

    _stringifyConfig: function (config) {
      // don't let people edit the store configuration, just the
      // track configuration.  make a shallow copy and delete the
      // store conf.  will add back in later.
      var c = dojo.mixin({}, config) // shallow copy
      delete c.store

      // put a style in there if there isn't already one, for convenience
      if (!c.style) c.style = {}
      if (!c.metadata) c.metadata = {}

      return JSON.stringify(c, undefined, 2)
    },

    _reportError: function (error) {
      this.errorReportArea.innerHTML = '<div class="error">' + error + '</div>'
      this.applyButton.set('disabled', true)
    },
    _clearErrors: function () {
      dom.empty(this.errorReportArea)
      this.applyButton.set('disabled', false)
    },

    _parseNewConfig: function (conf) {
      var newconf
      try {
        newconf = JSON.parse(conf, true)
        this._clearErrors()
      } catch (e) {
        this._reportError(e)
      }
      if (newconf) newconf.store = this.trackConfig.store
      return newconf
    },
  })
})
