define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/keys',
  'dojo/query',
], function (declare, lang, dom, domClass, keys, query) {
  return declare(null, {
    _makeTextFilterNodes: function (trackListDiv) {
      this.textFilterDiv = dom.create(
        'div',
        {
          className: 'textfilter',
          style: {
            position: 'relative',
            overflow: 'hidden',
          },
        },
        trackListDiv,
      )
      this.textFilterInput = dom.create(
        'input',
        {
          type: 'text',
          placeholder: 'filter tracks',
          onkeypress: lang.hitch(this, function (evt) {
            if (evt.keyCode == keys.ESCAPE) {
              this.textFilterInput.value = ''
            }

            if (this.textFilterTimeout) {
              window.clearTimeout(this.textFilterTimeout)
            }
            this.textFilterTimeout = window.setTimeout(
              lang.hitch(this, function () {
                this._updateTextFilterControl()
                this._textFilter(this.textFilterInput.value)
              }),
              500,
            )
            this._updateTextFilterControl()

            evt.stopPropagation()
          }),
        },
        this.textFilterDiv,
      )

      // make a "clear" button for the text filtering input
      this.textFilterClearButton = dom.create(
        'div',
        {
          className: 'jbrowseIconCancel',
          onclick: lang.hitch(this, function () {
            this._clearTextFilterControl()
            this._textFilter(this.textFilterInput.value)
          }),
        },
        this.textFilterDiv,
      )
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
        domClass.remove(this.textFilterDiv, 'dijitDisabled')
      } else {
        domClass.add(this.textFilterDiv, 'dijitDisabled')
      }
    },

    _textFilter: function (text) {
      if (text && /\S/.test(text)) {
        text = text.toLowerCase()

        query('.tracklist-label', this.containerNode).forEach(
          function (labelNode, i) {
            if (labelNode.innerHTML.toLowerCase().indexOf(text) != -1) {
              domClass.remove(labelNode, 'collapsed')
              domClass.add(labelNode, 'shown')
            } else {
              domClass.add(labelNode, 'collapsed')
              domClass.remove(labelNode, 'shown')
            }
          },
        )
      } else {
        query('.tracklist-label', this.containerNode)
          .removeClass('collapsed')
          .addClass('shown')
      }
    },
  })
})
