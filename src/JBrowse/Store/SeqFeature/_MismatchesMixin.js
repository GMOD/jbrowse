/**
 * Functions for parsing MD and CIGAR strings.
 */

export function parseCigar(cigar) {
  return (cigar || '').split(/([MIDNSHPX=])/)
}
export function cigarToMismatches(ops, seq) {
  let currOffset = 0
  let seqOffset = 0
  const mismatches = []
  for (let i = 0; i < ops.length - 1; i += 2) {
    const len = +ops[i]
    const op = ops[i + 1]
    if (op === 'M' || op === '=' || op === 'E') {
      seqOffset += len
    }
    if (op === 'I') {
      // GAH: shouldn't length of insertion really by 0, since JBrowse internally uses zero-interbase coordinates?
      mismatches.push({
        start: currOffset,
        type: 'insertion',
        base: `${len}`,
        length: 1,
      })
      seqOffset += len
    } else if (op === 'D') {
      mismatches.push({
        start: currOffset,
        type: 'deletion',
        base: '*',
        length: len,
      })
    } else if (op === 'N') {
      mismatches.push({
        start: currOffset,
        type: 'skip',
        base: 'N',
        length: len,
      })
    } else if (op === 'X') {
      const r = seq.slice(seqOffset, seqOffset + len)
      for (let j = 0; j < len; j++) {
        mismatches.push({
          start: currOffset + j,
          type: 'mismatch',
          base: r[j],
          length: 1,
        })
      }
      seqOffset += len
    } else if (op === 'H') {
      mismatches.push({
        start: currOffset,
        type: 'hardclip',
        base: `H${len}`,
        cliplen: len,
        length: 1,
      })
    } else if (op === 'S') {
      mismatches.push({
        start: currOffset,
        type: 'softclip',
        base: `S${len}`,
        cliplen: len,
        length: 1,
      })
      seqOffset += len
    }
    if (op !== 'I' && op !== 'S' && op !== 'H') {
      currOffset += len
    }
  }
  return mismatches
}
/**
 * parse a SAM MD tag to find mismatching bases of the template versus the reference
 * @returns array of mismatches and their positions
 */
export function mdToMismatches(mdstring, cigarOps, cigarMismatches, seq) {
  const mismatchRecords = []
  let curr = { start: 0, base: '', length: 0, type: 'mismatch' }
  const skips = cigarMismatches.filter(cigar => cigar.type === 'skip')
  let lastCigar = 0
  let lastTemplateOffset = 0
  let lastRefOffset = 0
  let lastSkipPos = 0

  // convert a position on the reference sequence to a position
  // on the template sequence, taking into account hard and soft
  // clipping of reads

  function nextRecord() {
    mismatchRecords.push(curr)

    // get a new mismatch record ready
    curr = {
      start: curr.start + curr.length,
      length: 0,
      base: '',
      type: 'mismatch',
    }
  }

  function getTemplateCoordLocal(refCoord) {
    let templateOffset = lastTemplateOffset
    let refOffset = lastRefOffset
    for (
      let i = lastCigar;
      i < cigarOps.length && refOffset <= refCoord;
      i += 2, lastCigar = i
    ) {
      const len = +cigarOps[i]
      const op = cigarOps[i + 1]
      if (op === 'S' || op === 'I') {
        templateOffset += len
      } else if (op === 'D' || op === 'P' || op === 'N') {
        refOffset += len
      } else if (op !== 'H') {
        templateOffset += len
        refOffset += len
      }
    }
    lastTemplateOffset = templateOffset
    lastRefOffset = refOffset

    return templateOffset - (refOffset - refCoord)
  }

  // now actually parse the MD string
  const md = mdstring.match(/(\d+|\^[a-z]+|[a-z])/gi) || []
  for (let i = 0; i < md.length; i++) {
    const token = md[i]
    if (token.match(/^\d/)) {
      curr.start += parseInt(token, 10)
    } else if (token.match(/^\^/)) {
      curr.length = token.length - 1
      curr.base = '*'
      curr.type = 'deletion'
      curr.seq = token.substring(1)
      nextRecord()
    } else if (token.match(/^[a-z]/i)) {
      // mismatch
      for (let j = 0; j < token.length; j += 1) {
        curr.length = 1

        while (lastSkipPos < skips.length) {
          const mismatch = skips[lastSkipPos]
          if (curr.start >= mismatch.start) {
            curr.start += mismatch.length
            lastSkipPos++
          } else {
            break
          }
        }
        curr.base = seq
          ? seq.substr(
              cigarOps ? getTemplateCoordLocal(curr.start) : curr.start,
              1,
            )
          : 'X'
        curr.altbase = token
        nextRecord()
      }
    }
  }
  return mismatchRecords
}
export function getTemplateCoord(refCoord, cigarOps) {
  let templateOffset = 0
  let refOffset = 0
  for (let i = 0; i < cigarOps.length && refOffset <= refCoord; i += 2) {
    const len = +cigarOps[i]
    const op = cigarOps[i + 1]
    if (op === 'S' || op === 'I') {
      templateOffset += len
    } else if (op === 'D' || op === 'P') {
      refOffset += len
    } else if (op !== 'H') {
      templateOffset += len
      refOffset += len
    }
  }
  return templateOffset - (refOffset - refCoord)
}

// adapted from minimap2 code static void write_MD_core function
export function generateMD(target, query, cigar) {
  let queryOffset = 0
  let targetOffset = 0
  let lengthMD = 0
  if (!target) {
    console.warn('no ref supplied to generateMD')
    return ''
  }
  const cigarOps = parseCigar(cigar)
  let str = ''
  for (let i = 0; i < cigarOps.length; i += 2) {
    const len = +cigarOps[i]
    const op = cigarOps[i + 1]
    if (op === 'M' || op === 'X' || op === '=') {
      for (let j = 0; j < len; j++) {
        if (
          query[queryOffset + j].toLowerCase() !==
          target[targetOffset + j].toLowerCase()
        ) {
          str += `${lengthMD}${target[targetOffset + j].toUpperCase()}`
          lengthMD = 0
        } else {
          lengthMD++
        }
      }
      queryOffset += len
      targetOffset += len
    } else if (op === 'I') {
      queryOffset += len
    } else if (op === 'D') {
      let tmp = ''
      for (let j = 0; j < len; j++) {
        tmp += target[targetOffset + j].toUpperCase()
      }
      str += `${lengthMD}^${tmp}`
      lengthMD = 0
      targetOffset += len
    } else if (op === 'N') {
      targetOffset += len
    } else if (op === 'S') {
      queryOffset += len
    }
  }
  if (lengthMD > 0) {
    str += lengthMD
  }
  return str
}

define(['dojo/_base/declare', 'dojo/_base/array'], function (declare, array) {
  return declare(null, {
    constructor: function () {
      this.cigarAttributeName = (
        this.config.cigarAttribute || 'cigar'
      ).toLowerCase()
      this.mdAttributeName = (this.config.mdAttribute || 'md').toLowerCase()
    },

    _getSkipsAndDeletions: function (feature) {
      let mismatches = []
      // parse the CIGAR tag if it has one
      var cigarString = feature.get(this.cigarAttributeName)
      if (cigarString) {
        mismatches = this._cigarToSkipsAndDeletions(
          feature,
          parseCigar(cigarString),
        )
      } else {
        var cramReadFeatures = feature.get('cram_read_features')
        if (
          this.config.renderAlignment &&
          cramReadFeatures &&
          cramReadFeatures.length
        ) {
          mismatches = mismatches.filter(
            m => !(m.type == 'deletion' || m.type == 'mismatch'),
          )
        }

        // parse the CRAM read features if it has them
        if (cramReadFeatures) {
          mismatches.push(
            ...this._cramReadFeaturesToMismatches(
              feature,
              cramReadFeatures,
            ).filter(m => m.type === 'skip' || m.type === 'deletion'),
          )
        }
      }

      return mismatches
    },

    _getMismatches: function (feature) {
      var mismatches = []
      if (this.config.cacheMismatches && feature.record.mismatches) {
        return feature.record.mismatches
      }

      // parse the CIGAR tag if it has one
      var cigarString = feature.get(this.cigarAttributeName),
        cigarOps
      if (cigarString) {
        cigarOps = parseCigar(cigarString)
        mismatches.push.apply(
          mismatches,
          cigarToMismatches(cigarOps, feature.get('seq')),
        )
      }

      // now let's look for CRAM or MD mismatches
      var cramReadFeatures = feature.get('cram_read_features')
      var mdString = feature.get(this.mdAttributeName)

      // if there is an MD tag or CRAM mismatches, mismatches and deletions from the
      // CIGAR string are replaced by those from MD
      if (
        this.config.renderAlignment &&
        ((cramReadFeatures && cramReadFeatures.length) || mdString)
      ) {
        mismatches = mismatches.filter(
          m => !(m.type == 'deletion' || m.type == 'mismatch'),
        )
      }

      // parse the CRAM read features if it has them
      if (cramReadFeatures) {
        mismatches = mismatches.concat(
          this._cramReadFeaturesToMismatches(feature, cramReadFeatures),
        )
      }

      // parse the MD tag if it has one
      if (mdString) {
        mismatches = mismatches.concat(
          mdToMismatches(mdString, cigarOps, mismatches, feature.get('seq')),
        )
      }

      // uniqify the mismatches
      var seen = {}
      mismatches = array.filter(mismatches, function (m) {
        var key = `${m.type},${m.start},${m.length}`
        var s = seen[key]
        seen[key] = true
        return !s
      })
      if (this.config.cacheMismatches) {
        feature.record.mismatches = mismatches
      }

      return mismatches
    },

    _cramReadFeaturesToMismatches(feature, readFeatures) {
      const start = feature.get('start')
      const mismatches = []
      readFeatures.forEach(({ code, refPos, data, sub, ref }) => {
        refPos = refPos - 1 - start
        if (code === 'X') {
          // substitution
          mismatches.push({
            start: refPos,
            length: 1,
            base: sub,
            altbase: ref,
            type: 'mismatch',
          })
        } else if (code === 'I') {
          // insertion
          mismatches.push({
            start: refPos,
            type: 'insertion',
            base: `${data.length}`,
            length: data.length,
          })
        } else if (code === 'N') {
          // reference skip
          mismatches.push({
            type: 'skip',
            length: data,
            start: refPos,
            base: 'N',
          })
        } else if (code === 'S') {
          // soft clip
          const len = data.length
          mismatches.push({
            start: refPos,
            type: 'softclip',
            base: `S${len}`,
            cliplen: len,
            length: 1,
          })
        } else if (code === 'P') {
          // padding
        } else if (code === 'H') {
          // hard clip
          const len = data
          mismatches.push({
            start: refPos,
            type: 'hardclip',
            base: `H${len}`,
            cliplen: len,
            length: 1,
          })
        } else if (code === 'D') {
          // deletion
          mismatches.push({
            type: 'deletion',
            length: data,
            start: refPos,
            base: '*',
          })
        } else if (code === 'b') {
          // stretch of bases
        } else if (code === 'q') {
          // stretch of qual scores
        } else if (code === 'B') {
          // a pair of [base, qual]
        } else if (code === 'i') {
          // single-base insertion
          // insertion
          mismatches.push({
            start: refPos,
            type: 'insertion',
            base: data,
            length: 1,
          })
        } else if (code === 'Q') {
          // single quality value
        }
      })
      return mismatches
    },

    // parse just the skips and deletions out of a CIGAR string
    _cigarToSkipsAndDeletions: function (feature, ops) {
      var currOffset = 0
      var mismatches = []
      for (let i = 0; i < ops.length; i += 2) {
        var len = +ops[i]
        var op = ops[i + 1]
        if (op == 'D') {
          mismatches.push({
            start: currOffset,
            type: 'deletion',
            base: '*',
            length: len,
          })
        } else if (op == 'N') {
          mismatches.push({
            start: currOffset,
            type: 'skip',
            base: 'N',
            length: len,
          })
        }

        if (op != 'I' && op != 'S' && op != 'H') {
          currOffset += len
        }
      }
      return mismatches
    },
  })
})
