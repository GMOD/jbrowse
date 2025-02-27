define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/query',
  'JBrowse/View/Track/BlockBased',
  'JBrowse/View/Track/_ExportMixin',
  'JBrowse/CodonTable',
  'JBrowse/Util',
], function (
  declare,
  array,
  lang,
  dom,
  domClass,
  query,
  BlockBased,
  ExportMixin,
  CodonTable,
  Util,
) {
  return declare(
    [BlockBased, ExportMixin, CodonTable],
    /**
     * @lends JBrowse.View.Track.Sequence.prototype
     */
    {
      /**
       * Track to display the underlying reference sequence, when zoomed in
       * far enough.
       *
       * @constructs
       * @extends JBrowse.View.Track.BlockBased
       */
      constructor: function (args) {
        this._charMeasurements = {}
        this._codonTable = this.generateCodonTable(
          lang.mixin(this.defaultCodonTable, this.config.codonTable),
        )
        this._codonStarts = this.config.codonStarts || this.defaultStarts
        this._codonStops = this.config.codonStops || this.defaultStops
      },

      _defaultConfig: function () {
        return {
          maxExportSpan: 500000,
          showForwardStrand: true,
          showReverseStrand: true,
          showTranslation: true,
          showColor: true,
          seqType: 'dna',
          proteinColorScheme: 'taylor',
        }
      },
      _exportFormats: function () {
        return [{ name: 'FASTA', label: 'FASTA', fileExt: 'fasta' }]
      },

      endZoom: function (destScale, destBlockBases) {
        this.clear()
      },

      setViewInfo: function (
        genomeView,
        heightUpdate,
        numBlocks,
        trackDiv,
        widthPct,
        widthPx,
        scale,
      ) {
        this.inherited(arguments)
        this.show()
      },

      nbsp: String.fromCharCode(160),

      fillBlock: function (args) {
        var blockIndex = args.blockIndex
        var block = args.block
        var leftBase = args.leftBase
        var rightBase = args.rightBase
        var scale = args.scale

        var leftExtended = leftBase - 2
        var rightExtended = rightBase + 2

        var thisB = this

        var blur = dojo.create(
          'div',
          {
            className: 'sequence_blur',
            innerHTML: '<span class="loading">Loading</span>',
          },
          block.domNode,
        )

        this.heightUpdate(blur.offsetHeight + 2 * blur.offsetTop, blockIndex)

        // if we are zoomed in far enough to draw bases, then draw them
        if (scale >= 1.3) {
          this.store.getReferenceSequence(
            {
              ref: this.refSeq.name,
              start: leftExtended,
              end: rightExtended,
            },
            function (seq) {
              if (seq.trim() == '') {
                blur.innerHTML =
                  '<span class="zoom">No sequence available</span>'
              } else {
                dom.empty(block.domNode)
                thisB._fillSequenceBlock(block, blockIndex, scale, seq)
              }
              args.finishCallback()
            },
            function (error) {
              if (args.errorCallback) {
                args.errorCallback(error)
              } else {
                console.error(error)
                args.finishCallback()
              }
            },
          )
        }
        // otherwise, just draw a sort of line (possibly dotted) that
        // suggests there are bases there if you zoom in far enough
        else {
          blur.innerHTML = '<span class="zoom">Zoom in to see sequence</span>'
          args.finishCallback()
        }
      },

      _fillSequenceBlock: function (block, blockIndex, scale, seq) {
        seq = seq.replace(/\s/g, this.nbsp)

        var blockStart = block.startBase
        var blockEnd = block.endBase
        var blockSeq = seq.substring(2, seq.length - 2)
        var blockLength = blockSeq.length

        var extStart = blockStart - 2
        var extEnd = blockStart + 2
        var leftover = (seq.length - 2) % 3
        var extStartSeq = seq.substring(0, seq.length - 2)
        var extEndSeq = seq.substring(2)

        if (this.config.showForwardStrand && this.config.showTranslation) {
          var frameDiv = []
          for (var i = 0; i < 3; i++) {
            var transStart = blockStart + i
            var frame = ((transStart % 3) + 3) % 3
            var translatedDiv = this._renderTranslation(
              extEndSeq,
              i,
              blockStart,
              blockEnd,
              blockLength,
              scale,
            )
            frameDiv[frame] = translatedDiv
            domClass.add(translatedDiv, `frame${frame}`)
          }
          for (var i = 2; i >= 0; i--) {
            block.domNode.appendChild(frameDiv[i])
          }
        }

        // make a table to contain the sequences
        var charSize = this.getCharacterMeasurements('sequence')
        var bigTiles = scale > charSize.w + 4 // whether to add .big styles to the base tiles
        var seqNode
        if (this.config.showReverseStrand || this.config.showForwardStrand) {
          seqNode = dom.create(
            'table',
            {
              className: `sequence${
                bigTiles ? ' big' : ''
              }${this.config.showColor ? '' : ' nocolor'}`,
              style: { width: '100%' },
            },
            block.domNode,
          )
        }

        // add a table for the forward strand
        if (this.config.showForwardStrand) {
          seqNode.appendChild(
            this._renderSeqTr(blockStart, blockEnd, blockSeq, scale),
          )
        }

        // and one for the reverse strand
        if (this.config.showReverseStrand) {
          var comp = this._renderSeqTr(
            blockStart,
            blockEnd,
            Util.complement(blockSeq),
            scale,
          )
          comp.className = 'revcom'
          seqNode.appendChild(comp)

          if (this.config.showTranslation) {
            var frameDiv = []
            for (var i = 0; i < 3; i++) {
              var transStart = blockStart + 1 - i
              var frame = ((transStart % 3) + 3 + leftover) % 3
              var translatedDiv = this._renderTranslation(
                extStartSeq,
                i,
                blockStart,
                blockEnd,
                blockLength,
                scale,
                true,
              )
              frameDiv[frame] = translatedDiv
              domClass.add(translatedDiv, `frame${frame}`)
            }
            for (var i = 0; i < 3; i++) {
              block.domNode.appendChild(frameDiv[i])
            }
          }
        }

        var totalHeight = 0
        array.forEach(block.domNode.childNodes, function (table) {
          totalHeight += table.clientHeight || table.offsetHeight
        })
        this.heightUpdate(totalHeight, blockIndex)
      },

      _renderTranslation: function (
        seq,
        offset,
        blockStart,
        blockEnd,
        blockLength,
        scale,
        reverse,
      ) {
        seq = reverse ? Util.revcom(seq) : seq

        var extraBases = (seq.length - offset) % 3
        var seqSliced = seq.slice(offset, seq.length - extraBases)

        var translated = ''
        for (var i = 0; i < seqSliced.length; i += 3) {
          var nextCodon = seqSliced.slice(i, i + 3)
          var aminoAcid = this._codonTable[nextCodon] || this.nbsp
          translated += aminoAcid
        }

        translated = reverse
          ? translated.split('').reverse().join('')
          : translated // Flip the translated seq for left-to-right rendering
        var orientedSeqSliced = reverse
          ? seqSliced.split('').reverse().join('')
          : seqSliced

        var charSize = this.getCharacterMeasurements('aminoAcid')
        var bigTiles = scale > charSize.w + 4 // whether to add .big styles to the base tiles

        var charWidth = 100 / (blockLength / 3)

        var container = dom.create('div', {
          className: 'translatedSequence',
        })
        var table = dom.create(
          'table',
          {
            className: `translatedSequence offset${offset}${bigTiles ? ' big' : ''}`,
            style: {
              width: `${charWidth * translated.length}%`,
            },
          },
          container,
        )
        var tr = dom.create('tr', {}, table)

        table.style.left = `${
          reverse
            ? 100 - charWidth * (translated.length + offset / 3)
            : (charWidth * offset) / 3
        }%`

        charWidth = `${100 / translated.length}%`

        var drawChars = scale >= charSize.w
        if (drawChars) {
          table.className += ' big'
        }

        for (var i = 0; i < translated.length; i++) {
          var aminoAcidSpan = document.createElement('td')
          var originalCodon = orientedSeqSliced.slice(3 * i, 3 * i + 3)
          originalCodon = reverse
            ? originalCodon.split('').reverse().join('')
            : originalCodon
          aminoAcidSpan.className = `aminoAcid aminoAcid_${translated.charAt(i).toLowerCase()}`

          // However, if it's known to be a start/stop, apply those CSS classes instead.
          if (this._codonStarts.indexOf(originalCodon.toUpperCase()) != -1) {
            aminoAcidSpan.className = 'aminoAcid aminoAcid_start'
          }
          if (this._codonStops.indexOf(originalCodon.toUpperCase()) != -1) {
            aminoAcidSpan.className = 'aminoAcid aminoAcid_stop'
          }

          aminoAcidSpan.style.width = charWidth
          if (drawChars) {
            aminoAcidSpan.innerHTML = translated.charAt(i)
          }
          tr.appendChild(aminoAcidSpan)
        }
        return container
      },

      /**
       * Given the start and end coordinates, and the sequence bases,
       * makes a table row containing the sequence.
       * @private
       */
      _renderSeqTr: function (start, end, seq, scale) {
        var charSize = this.getCharacterMeasurements('sequence')
        var container = document.createElement('tr')
        var charWidth = `${100 / (end - start)}%`
        var drawChars = scale >= charSize.w
        var baseClassDefault = 'base'
        if (this.config.seqType === 'protein') {
          baseClassDefault += ` aaScheme_${this.config.proteinColorScheme}`
        }
        for (var i = 0; i < seq.length; i++) {
          var base = document.createElement('td')
          base.className = `${baseClassDefault} base_${seq.charAt(i).toLowerCase()}`
          base.style.width = charWidth
          if (drawChars) {
            base.innerHTML = seq.charAt(i)
          }
          container.appendChild(base)
        }
        return container
      },

      startZoom: function () {
        query('.base', this.div).empty()
      },

      /**
       * @returns {Object} containing <code>h</code> and <code>w</code>,
       *      in pixels, of the characters being used for sequences
       */
      getCharacterMeasurements: function (className) {
        return (
          this._charMeasurements[className] ||
          (this._charMeasurements[className] =
            this._measureSequenceCharacterSize(this.div, className))
        )
      },

      /**
       * Conducts a test with DOM elements to measure sequence text width
       * and height.
       */
      _measureSequenceCharacterSize: function (containerElement, className) {
        var widthTest = document.createElement('td')
        widthTest.className = className
        widthTest.style.visibility = 'hidden'
        var widthText = '12345678901234567890123456789012345678901234567890'
        widthTest.appendChild(document.createTextNode(widthText))
        containerElement.appendChild(widthTest)
        var result = {
          w: widthTest.clientWidth / widthText.length + 1,
          h: widthTest.clientHeight,
        }
        containerElement.removeChild(widthTest)
        return result
      },

      _trackMenuOptions: function () {
        var track = this
        var o = this.inherited(arguments)
        o.push({ type: 'dijit/MenuSeparator' })
        o.push.apply(o, [
          {
            label: 'Show forward strand',
            type: 'dijit/CheckedMenuItem',
            checked: !!this.config.showForwardStrand,
            onClick: function (event) {
              track.config.showForwardStrand = this.checked
              track.changed()
            },
          },
          {
            label: 'Show reverse strand',
            type: 'dijit/CheckedMenuItem',
            checked: !!this.config.showReverseStrand,
            onClick: function (event) {
              track.config.showReverseStrand = this.checked
              track.changed()
            },
          },
          {
            label: 'Show translation',
            type: 'dijit/CheckedMenuItem',
            checked: !!this.config.showTranslation,
            onClick: function (event) {
              track.config.showTranslation = this.checked
              track.changed()
            },
          },
          {
            label: 'Show color',
            type: 'dijit/CheckedMenuItem',
            checked: !!this.config.showColor,
            onClick: function (event) {
              track.config.showColor = this.checked
              track.changed()
            },
          },
        ])
        return o
      },
    },
  )
})
