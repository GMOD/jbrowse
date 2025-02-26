define([
  'dojo/_base/declare',
  'dojo/dom-construct',

  'dijit/Toolbar',
  'dijit/form/Button',
  'JBrowse/Util',
  'JBrowse/has',
], function (declare, dom, Toolbar, Button, Util, has) {
  return declare(null, {
    constructor: function (args) {
      if (typeof args === 'undefined') {
        this.width = 78
        return
      }

      this.width = args.width || 78
      this.htmlMaxRows = args.htmlMaxRows || 15
      this.track = args.track
      this.canSaveFiles =
        args.track && args.track._canSaveFiles && args.track._canSaveFiles()

      // hook point
      if (typeof this.initData === 'function') this.initData(args)
    },
    renderHTML: function (region, seq, parent) {
      var thisB = this
      var text = this.renderText(region, seq)
      var lineCount = text.match(/\n/g).length + 1
      var container = dom.create('div', { className: 'fastaView' }, parent)

      if (this.canSaveFiles) {
        var toolbar = new Toolbar().placeAt(container)
        var thisB = this

        // hook point
        if (typeof thisB.addButtons === 'function')
          thisB.addButtons(region, seq, toolbar)

        toolbar.addChild(
          new Button({
            iconClass: 'dijitIconSave',
            label: 'FASTA',
            title: 'save as FASTA',
            disabled: !has('save-generated-files'),
            onClick: function () {
              thisB.track._fileDownload({
                format: 'FASTA',
                filename: Util.assembleLocString(region) + '.fasta',
                data: text,
              })
            },
          }),
        )
      }

      var textArea = dom.create(
        'textarea',
        {
          className: 'fasta',
          cols: this.width,
          rows: Math.min(lineCount, this.htmlMaxRows),
          readonly: true,
        },
        container,
      )
      var c = 0
      textArea.innerHTML = text.replace(/\n/g, function () {
        return c++ ? '' : '\n'
      })
      return container
    },
    /**
     * returns FASTA formatted string
     * @param {region object} region - fasta formated text string
     * @param {string} seq - unformated sequence
     * @returns {String} - fasta formated string
     */
    renderText: function (region, seq) {
      return (
        '>' +
        region.ref +
        ' ' +
        Util.assembleLocString(region) +
        (region.type ? ' class=' + region.type : '') +
        ' length=' +
        (region.end - region.start) +
        '\n' +
        this._wrap(seq, this.width)
      )
    },
    _wrap: function (string, length) {
      length = length || this.width
      return string.replace(new RegExp('(.{' + length + '})', 'g'), '$1\n')
    },
  })
})
