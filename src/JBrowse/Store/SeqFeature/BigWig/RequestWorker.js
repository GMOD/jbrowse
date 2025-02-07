const snakeCase = cjsRequire('snake-case')

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'JBrowse/Util',
  'JBrowse/Util/RejectableFastPromise',
  'dojo/promise/all',
  'JBrowse/Model/Range',
  'JBrowse/Model/SimpleFeature',
  'JBrowse/Util/jszlib',
  'JBrowse/Util/arrayCopy',
], function (
  declare,
  dlang,
  array,
  Util,
  RejectableFastPromise,
  all,
  Range,
  SimpleFeature,
  inflate,
  arrayCopy,
) {
  var dlog = function () {
    console.log.apply(console, arguments)
  }

  const defaultAutoSql = {
    name: 'BigBED file',
    description: 'this file has no associated autoSQL',
    fields: [
      {
        type: 'string',
        name: 'chrom',
        description: 'Name of chromosome ',
      },
      {
        type: 'uint',
        name: 'chromStart',
        description: 'Start position (first base is 0).',
      },
      {
        type: 'uint',
        name: 'chromEnd',
        description: 'End position plus one (chromEnd – chromStart = size).',
      },
      {
        type: 'string',
        name: 'name',
        description: 'Name of feature.',
      },
      {
        type: 'float',
        name: 'score',
        description:
          'A number between 0 and 1000 that controls shading of item (0 if unused).',
      },
      {
        type: 'string',
        name: 'strand',
        description: '+ or – (or . for unknown).',
      },
      {
        type: 'uint',
        name: 'thickStart',
        description:
          'Start position where feature is drawn as thicker line; used for CDS start for genes.',
      },
      {
        type: 'uint',
        name: 'thickEnd',
        description: 'Position where thicker part of feature ends.',
      },
      {
        type: 'string',
        name: 'itemRgb',
        description:
          'Comma-separated list of red, green, blue values from 0-255 (0 if unused).',
      },
      {
        type: 'uint',
        name: 'blockCount',
        description:
          'For multipart items, the number of blocks; corresponds to exons for genes.',
      },
      {
        type: 'string',
        name: 'blockSizes',
        description: 'Comma-separated list of block sizes.',
      },
      {
        type: 'string',
        name: 'chromStarts',
        description:
          'Comma-separated list of block starts relative to chromStart.',
      },
    ],
  }

  var RequestWorker = declare(
    null,
    /**
     * @lends JBrowse.Store.BigWig.Window.RequestWorker.prototype
     */
    {
      BIG_WIG_TYPE_GRAPH: 1,
      BIG_WIG_TYPE_VSTEP: 2,
      BIG_WIG_TYPE_FSTEP: 3,

      /**
       * Worker object for reading data from a bigwig or bigbed file.
       * Manages the state necessary for traversing the index trees and
       * so forth.
       *
       * Adapted by Robert Buels from bigwig.js in the Dalliance Genome
       * Explorer by Thomas Down.
       * @constructs
       */
      constructor: function (window, chr, min, max, callback, errorCallback) {
        this.window = window
        this.source = window.bwg.name || undefined

        this.blocksToFetch = []
        this.outstanding = 0

        this.chr = chr
        this.min = min
        this.max = max
        this.callback = callback
        this.errorCallback =
          errorCallback ||
          function (e) {
            console.error(e, e.stack, arguments.caller)
          }
      },

      cirFobRecur: function (offset, level) {
        this.outstanding += offset.length

        var maxCirBlockSpan = 4 + this.window.cirBlockSize * 32 // Upper bound on size, based on a completely full leaf node.
        var spans
        for (var i = 0; i < offset.length; ++i) {
          var blockSpan = new Range(offset[i], offset[i] + maxCirBlockSpan)
          spans = spans ? spans.union(blockSpan) : blockSpan
        }

        var fetchRanges = spans.ranges()
        //dlog('fetchRanges: ' + fetchRanges);
        for (var r = 0; r < fetchRanges.length; ++r) {
          var fr = fetchRanges[r]
          this.cirFobStartFetch(offset, fr, level)
        }
      },

      cirFobStartFetch: function (offset, fr, level, attempts) {
        var length = fr.max() - fr.min()
        // dlog('fetching ' + fr.min() + '-' + fr.max() + ' (' + Util.humanReadableNumber(length) + ')');
        //console.log('cirfobstartfetch');
        this.window.bwg._read(
          fr.min(),
          length,
          dlang.hitch(this, function (resultBuffer) {
            for (var i = 0; i < offset.length; ++i) {
              if (fr.contains(offset[i])) {
                this.cirFobRecur2(resultBuffer, offset[i] - fr.min(), level)
                --this.outstanding
                if (this.outstanding == 0) {
                  this.cirCompleted()
                }
              }
            }
          }),
          this.errorCallback,
        )
      },

      cirFobRecur2: function (cirBlockData, offset, level) {
        var data = this.window.bwg.newDataView(cirBlockData, offset)

        var isLeaf = data.getUint8()
        var cnt = data.getUint16(2)
        //dlog('cir level=' + level + '; cnt=' + cnt);

        if (isLeaf != 0) {
          for (var i = 0; i < cnt; ++i) {
            var startChrom = data.getUint32()
            var startBase = data.getUint32()
            var endChrom = data.getUint32()
            var endBase = data.getUint32()
            var blockOffset = data.getUint64()
            var blockSize = data.getUint64()
            if (
              (startChrom < this.chr ||
                (startChrom == this.chr && startBase <= this.max)) &&
              (endChrom > this.chr ||
                (endChrom == this.chr && endBase >= this.min))
            ) {
              // dlog('Got an interesting block: startBase=' + startBase + '; endBase=' + endBase + '; offset=' + blockOffset + '; size=' + blockSize);
              this.blocksToFetch.push({
                offset: blockOffset,
                size: blockSize,
              })
            }
          }
        } else {
          var recurOffsets = []
          for (var i = 0; i < cnt; ++i) {
            var startChrom = data.getUint32()
            var startBase = data.getUint32()
            var endChrom = data.getUint32()
            var endBase = data.getUint32()
            var blockOffset = data.getUint64()
            if (
              (startChrom < this.chr ||
                (startChrom == this.chr && startBase <= this.max)) &&
              (endChrom > this.chr ||
                (endChrom == this.chr && endBase >= this.min))
            ) {
              recurOffsets.push(blockOffset)
            }
          }
          if (recurOffsets.length > 0) {
            this.cirFobRecur(recurOffsets, level + 1)
          }
        }
      },

      cirCompleted: function () {
        // merge contiguous blocks
        this.blockGroupsToFetch = this.groupBlocks(this.blocksToFetch)

        if (this.blockGroupsToFetch.length == 0) {
          this.callback([])
        } else {
          this.features = []
          this.readFeatures()
        }
      },

      groupBlocks: function (blocks) {
        // sort the blocks by file offset
        blocks.sort(function (b0, b1) {
          return (b0.offset | 0) - (b1.offset | 0)
        })

        // group blocks that are within 2KB of eachother
        var blockGroups = []
        var lastBlock
        var lastBlockEnd
        for (var i = 0; i < blocks.length; i++) {
          if (lastBlock && blocks[i].offset - lastBlockEnd <= 2000) {
            lastBlock.size += blocks[i].size - lastBlockEnd + blocks[i].offset
            lastBlock.blocks.push(blocks[i])
          } else {
            blockGroups.push(
              (lastBlock = {
                blocks: [blocks[i]],
                size: blocks[i].size,
                offset: blocks[i].offset,
              }),
            )
          }
          lastBlockEnd = lastBlock.offset + lastBlock.size
        }

        return blockGroups
      },

      createFeature: function (fmin, fmax, opts) {
        // dlog('createFeature(' + fmin +', ' + fmax + ', '+opts.score+')');

        var data = {
          start: fmin,
          end: fmax,
        }

        for (var k in opts) data[k] = opts[k]

        var id = data.id
        delete data.id

        var f = new SimpleFeature({
          data: data,
          id: id ? id : data.start + '_' + data.end + '_' + data.score,
        })

        this.features.push(f)
      },

      maybeCreateFeature: function (fmin, fmax, opts) {
        if (fmin <= this.max && fmax >= this.min) {
          this.createFeature(fmin, fmax, opts)
        }
      },

      parseSummaryBlock: function (bytes, startOffset) {
        var data = this.window.bwg.newDataView(bytes, startOffset)

        var itemCount = bytes.byteLength / 32
        for (var i = 0; i < itemCount; ++i) {
          var chromId = data.getInt32()
          var start = data.getInt32()
          var end = data.getInt32()
          var validCnt = data.getInt32() || 1
          var minVal = data.getFloat32()
          var maxVal = data.getFloat32()
          var sumData = data.getFloat32()
          var sumSqData = data.getFloat32()

          if (chromId == this.chr) {
            var summaryOpts = {
              score: sumData / validCnt,
              maxScore: maxVal,
              minScore: minVal,
            }
            if (this.window.bwg.type == 'bigbed') {
              summaryOpts.type = 'density'
            }
            this.maybeCreateFeature(start, end, summaryOpts)
          }
        }
      },

      parseBigWigBlock: function (bytes, startOffset) {
        var data = this.window.bwg.newDataView(bytes, startOffset)

        var itemSpan = data.getUint32(16)
        var blockType = data.getUint8(20)
        var itemCount = data.getUint16(22)

        // dlog('processing bigwig block, type=' + blockType + '; count=' + itemCount);

        if (blockType == this.BIG_WIG_TYPE_FSTEP) {
          var blockStart = data.getInt32(4)
          var itemStep = data.getUint32(12)
          for (var i = 0; i < itemCount; ++i) {
            var score = data.getFloat32(4 * i + 24)
            this.maybeCreateFeature(
              blockStart + i * itemStep,
              blockStart + i * itemStep + itemSpan,
              { score: score },
            )
          }
        } else if (blockType == this.BIG_WIG_TYPE_VSTEP) {
          for (var i = 0; i < itemCount; ++i) {
            var start = data.getInt32(8 * i + 24)
            var score = data.getFloat32()
            this.maybeCreateFeature(start, start + itemSpan, {
              score: score,
            })
          }
        } else if (blockType == this.BIG_WIG_TYPE_GRAPH) {
          for (var i = 0; i < itemCount; ++i) {
            var start = data.getInt32(12 * i + 24)
            var end = data.getInt32()
            var score = data.getFloat32()
            if (start > end) {
              start = end
            }
            this.maybeCreateFeature(start, end, { score: score })
          }
        } else {
          dlog('Currently not handling bwgType=' + blockType)
        }
      },

      parseBigBedBlock: function (bytes, startOffset) {
        var data = this.window.bwg.newDataView(bytes, startOffset)

        var offset = 0
        while (offset < bytes.byteLength) {
          const chromId = data.getUint32(offset)
          const start = data.getInt32(offset + 4)
          const end = data.getInt32(offset + 8)
          offset += 12
          if (chromId !== this.chr) {
            console.warn('BigBed block is out of current range')
            return
          }

          let rest = ''
          while (offset < bytes.byteLength) {
            let ch = data.getUint8(offset++)
            if (ch !== 0) {
              rest += String.fromCharCode(ch)
            } else {
              break
            }
          }

          const featureData = this.parseBedText(start, end, rest)
          featureData.id = `bb-${startOffset + offset}`
          this.maybeCreateFeature(start, end, featureData)
        }
      },

      /**
       * parse the `rest` field of a binary bed data section, using
       * the autosql schema defined for this file
       *
       * @returns {Object} feature data with native BED field names
       */
      parseBedText: function (start, end, rest) {
        // include ucsc-style names as well as jbrowse-style names
        const featureData = {
          start: start,
          end: end,
        }

        const bedColumns = rest.split('\t')
        const asql = this.window.autoSql || defaultAutoSql
        const numericTypes = ['uint', 'int', 'float', 'long']
        // first three columns (chrom,start,end) are not included in bigBed
        for (let i = 3; i < asql.fields.length; i++) {
          if (bedColumns[i - 3] !== '.' && bedColumns[i - 3] !== '') {
            const autoField = asql.fields[i]
            let columnVal = bedColumns[i - 3]

            // for speed, cache some of the tests we need inside the autofield definition
            if (!autoField._requestWorkerCache) {
              const match = /^(\w+)\[/.exec(autoField.type)
              autoField._requestWorkerCache = {
                isNumeric: numericTypes.includes(autoField.type),
                isArray: !!match,
                arrayIsNumeric: match && numericTypes.includes(match[1]),
              }
            }

            if (autoField._requestWorkerCache.isNumeric) {
              let num = Number(columnVal)
              // if the number parse results in NaN, somebody probably
              // listed the type erroneously as numeric, so don't use
              // the parsed number
              columnVal = isNaN(num) ? columnVal : num
            } else if (autoField._requestWorkerCache.isArray) {
              // parse array values
              columnVal = columnVal.split(',')
              if (columnVal[columnVal.length - 1] === '') columnVal.pop()
              if (autoField._requestWorkerCache.arrayIsNumeric)
                columnVal = columnVal.map(str => Number(str))
            }

            featureData[snakeCase(autoField.name)] = columnVal
          }
        }

        if (featureData.strand) {
          featureData.strand = { '-': -1, '+': 1 }[featureData.strand]
        }

        return featureData
      },

      readFeatures: function () {
        var thisB = this
        var blockFetches = array.map(
          thisB.blockGroupsToFetch,
          function (blockGroup) {
            //console.log( 'fetching blockgroup with '+blockGroup.blocks.length+' blocks: '+blockGroup );
            var d = new RejectableFastPromise()
            thisB.window.bwg._read(
              blockGroup.offset,
              blockGroup.size,
              function (data) {
                blockGroup.data = data
                d.resolve(blockGroup)
              },
              dlang.hitch(d, 'reject'),
            )
            return d
          },
          thisB,
        )

        all(blockFetches).then(function (blockGroups) {
          array.forEach(blockGroups, function (blockGroup) {
            array.forEach(blockGroup.blocks, function (block) {
              var data
              var offset = block.offset - blockGroup.offset
              if (thisB.window.bwg.uncompressBufSize > 0) {
                // var beforeInf = new Date();
                data = inflate(blockGroup.data, offset + 2, block.size - 2)
                offset = 0
                //console.log( 'inflate', 2, block.size - 2);
                // var afterInf = new Date();
                // dlog('inflate: ' + (afterInf - beforeInf) + 'ms');
              } else {
                data = blockGroup.data
              }

              if (thisB.window.isSummary) {
                thisB.parseSummaryBlock(data, offset)
              } else if (thisB.window.bwg.type == 'bigwig') {
                thisB.parseBigWigBlock(data, offset)
              } else if (thisB.window.bwg.type == 'bigbed') {
                thisB.parseBigBedBlock(data, offset)
              } else {
                dlog("Don't know what to do with " + thisB.window.bwg.type)
              }
            })
          })

          thisB.callback(thisB.features)
        }, thisB.errorCallback)
      },
    },
  )

  return RequestWorker
})
