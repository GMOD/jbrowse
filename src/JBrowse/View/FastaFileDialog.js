define([
  'dojo/_base/declare',
  'dijit/form/Button',
  'dijit/form/RadioButton',
  'dojo/dom-construct',
  'JBrowse/View/FileDialog',
  './FileDialog/TrackList/BgzipIndexedFASTADriver',
  './FileDialog/TrackList/IndexedFASTADriver',
  './FileDialog/TrackList/TwoBitDriver',
  './FileDialog/TrackList/ChromSizesDriver',
], function (
  declare,
  Button,
  RadioButton,
  dom,
  FileDialog,
  BgzipIndexedFASTADriver,
  IndexedFASTADriver,
  TwoBitDriver,
  ChromSizesDriver,
) {
  return declare(FileDialog, {
    constructor: function (args) {
      this.inherited(arguments)
      this._fileTypeDrivers = [
        new BgzipIndexedFASTADriver(),
        new IndexedFASTADriver(),
        new TwoBitDriver(),
        new ChromSizesDriver(),
      ]
      return this
    },

    show: function (args) {
      args.introMsg =
        'Select a FASTA file (.fa), indexed FASTA (.fa and .fai), bgzip indexed FASTA (.fa, .fai, and .gzi), twobit (.2bit) file, or a chrom.sizes file (tab separated refseq name and length)'
      this.inherited(arguments)
      this.dialog.set('title', 'Open sequence file')
    },

    _makeActionBar: function (openCallback, cancelCallback) {
      var actionBar = dom.create('div', {
        className: 'dijitDialogPaneActionBar',
      })
      var disChoices = (this.refSeqOrderChoice = [
        new RadioButton({
          id: 'sortAlpha',
          value: 'sortAlpha',
          checked: true,
        }),
        new RadioButton({ id: 'sortLength', value: 'sortLength' }),
        new RadioButton({ id: 'noSort', value: 'noSort' }),
      ])

      var aux = dom.create('div', { className: 'aux' }, actionBar)
      disChoices[0].placeAt(aux)
      dom.create(
        'label',
        { for: 'sortAlpha', innerHTML: 'Sort refseqs by name' },
        aux,
      ),
        disChoices[1].placeAt(aux)
      dom.create(
        'label',
        { for: 'sortLength', innerHTML: 'Sort refseqs by length' },
        aux,
      )
      disChoices[2].placeAt(aux)
      dom.create(
        'label',
        { for: 'noSort', innerHTML: 'Use order from file' },
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
        onClick: () => {
          if (openCallback) {
            openCallback({
              trackConfs: this.trackList.getTrackConfigurations(),
              refSeqOrder: this.refSeqOrderChoice[0].checked
                ? 'alphabetic descending'
                : this.refSeqOrderChoice[1].checked
                  ? 'length descending'
                  : undefined,
            }).then(
              () => this.dialog.hide(),
              err => {
                console.error(err)
              },
            )
          }
        },
      }).placeAt(actionBar)

      return { domNode: actionBar }
    },
  })
})
