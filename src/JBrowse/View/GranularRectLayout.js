/**
 * Rectangle-layout manager that lays out rectangles using bitmaps at
 * resolution that, for efficiency, may be somewhat lower than that of
 * the coordinate system for the rectangles being laid out.  `pitchX`
 * and `pitchY` are the ratios of input scale resolution to internal
 * bitmap resolution.
 */

// minimum excess size of the array at which we garbage collect
const minSizeToBotherWith = 10000
const maxFeaturePitchWidth = 20000

// a single row in the layout
class LayoutRow {
  constructor(rowNumber) {
    this.rowNumber = rowNumber
    this.padding = 1
    this.sizeLimit = 1000000

    // this.offset is the offset of the bits array relative to the genomic coordinates
    //      (modified by pitchX, but we don't know that in this class)
    // this.bits is the array of items in the layout row, indexed by (x - this.offset)
    // this.min is the leftmost edge of all the rectangles we have in the layout
    // this.max is the rightmost edge of all the rectangles we have in the layout
  }

  log(msg) {
    //if (this.rowNumber === 0)
    console.log(`r${this.rowNumber}: ${msg}`)
  }

  setAllFilled(data) {
    this.allFilled = data
  }

  getItemAt(x) {
    if (this.allFilled) return this.allFilled
    // return (
    //     this.min !== undefined &&
    //     x >= this.min &&
    //     x <= this.max &&
    //     this.bits[x - this.min]
    // )

    if (this.min === undefined) return undefined
    if (x < this.min) return undefined
    if (x >= this.max) return undefined
    const offset = x - this.offset
    // if (offset < 0)
    //     debugger
    // if (offset >= this.bits.length)
    //     debugger
    return this.bits[offset]
  }

  isRangeClear(left, right) {
    if (this.allFilled) return false

    if (this.min === undefined) return true

    if (right <= this.min || left >= this.max) return true

    // TODO: check right and middle before looping
    const maxX = Math.min(this.max, right)
    let x = Math.max(this.min, left)
    for (; x < right && x < maxX; x += 1) if (this.getItemAt(x)) return false

    return true
  }

  initialize(left, right) {
    // NOTE: this.min, this.max, and this.offset are interbase coordinates
    const rectWidth = right - left
    this.offset = left - rectWidth
    this.min = left
    this.max = right
    this.bits = new Array(right - left + 2 * rectWidth)
    // this.log(`initialize ${this.min} - ${this.max} (${this.bits.length})`)
  }

  addRect(rect, data) {
    const left = rect.l
    const right = rect.r + this.padding // only padding on the right

    // initialize if necessary
    if (this.min === undefined) {
      this.initialize(left, right)
    } else {
      // or check if we need to expand to the left and/or to the right

      // expand rightward by the feature length + whole current length if necessary
      const currLength = this.bits.length

      if (right - this.offset >= this.bits.length) {
        const additionalLength =
          right - this.offset - this.bits.length + 1 + this.bits.length
        if (this.bits.length + additionalLength > this.sizeLimit) {
          console.warn(
            `Layout width limit exceeded, discarding old layout. Please be more careful about discarding unused blocks.`,
          )
          this.initialize(left, right)
        } else if (additionalLength > 0) {
          this.bits = this.bits.concat(new Array(additionalLength))
          // this.log(`expand right (${additionalLength}): ${this.offset} | ${this.min} - ${this.max}`)
        }
      }

      // expand by 2x leftward if necessary
      if (left < this.offset) {
        const additionalLength = this.offset - left + currLength
        if (this.bits.length + additionalLength > this.sizeLimit) {
          console.warn(
            `Layout width limit exceeded, discarding old layout. Please be more careful about discarding unused blocks.`,
          )
          this.initialize(left, right)
        } else {
          this.bits = new Array(additionalLength).concat(this.bits)
          this.offset -= additionalLength
          // this.log(`expand left (${additionalLength}): ${this.offset} | ${this.min} - ${this.max}`)
        }
      }
    }

    // set the bits in the bitmask
    const oLeft = left - this.offset
    const oRight = right - this.offset
    // if (oLeft < 0) debugger
    // if (oRight < 0) debugger
    // if (oRight <= oLeft) debugger
    // if (oRight > this.bits.length) debugger
    if (oRight - oLeft > maxFeaturePitchWidth) {
      console.warn(
        `Layout X pitch set too low, feature spans ${oRight - oLeft} bits in a single row.`,
        rect,
        data,
      )
    }

    for (let x = oLeft; x < oRight; x += 1) {
      //if (this.bits[x] && this.bits[x].get('name') !== data.get('name')) debugger
      this.bits[x] = data
    }

    if (left < this.min) this.min = left
    if (right > this.max) this.max = right
    //// this.log(`added ${leftX} - ${rightX}`)
  }

  /**
   *  Given a range of interbase coordinates, deletes all data dealing with that range
   */
  discardRange(left, right) {
    if (this.allFilled) return // allFilled is irrevocable currently

    // if we have no data, do nothing
    if (!this.bits) return

    // if doesn't overlap at all, do nothing
    if (right <= this.min || left >= this.max) return

    // if completely encloses range, discard everything
    if (left <= this.min && right >= this.max) {
      this.min = undefined
      this.max = undefined
      this.bits = undefined
      this.offset = undefined
      return
    }

    // if overlaps left edge, adjust the min
    if (right > this.min && left <= this.min) {
      this.min = right
    }

    // if overlaps right edge, adjust the max
    if (left < this.max && right >= this.max) {
      this.max = left
    }

    // now trim the left, right, or both sides of the array
    if (
      this.offset < this.min - minSizeToBotherWith &&
      this.bits.length > this.max + minSizeToBotherWith - this.offset
    ) {
      // trim both sides
      const leftTrimAmount = this.min - this.offset
      const rightTrimAmount = this.bits.length - 1 - (this.max - this.offset)
      // if (rightTrimAmount <= 0) debugger
      // if (leftTrimAmount <= 0) debugger
      // this.log(`trim both sides, ${leftTrimAmount} from left, ${rightTrimAmount} from right`)
      this.bits = this.bits.slice(
        leftTrimAmount,
        this.bits.length - rightTrimAmount,
      )
      this.offset += leftTrimAmount
      // if (this.offset > this.min) debugger
      // if (this.bits.length <= this.max - this.offset) debugger
    } else if (this.offset < this.min - minSizeToBotherWith) {
      // trim left side
      const desiredOffset = this.min - Math.floor(minSizeToBotherWith / 2)
      const trimAmount = desiredOffset - this.offset
      // this.log(`trim left side by ${trimAmount}`)
      this.bits.splice(0, trimAmount)
      this.offset += trimAmount
      // if (this.offset > this.min) debugger
      // if (this.bits.length <= this.max - this.offset) debugger
    } else if (
      this.bits.length >
      this.max - this.offset + minSizeToBotherWith
    ) {
      // trim right side
      const desiredLength =
        this.max - this.offset + 1 + Math.floor(minSizeToBotherWith / 2)
      // this.log(`trim right side by ${this.bits.length-desiredLength}`)
      // if (desiredLength > this.bits.length) debugger
      this.bits.length = desiredLength
      // if (this.offset > this.min) debugger
      // if (this.bits.length <= this.max - this.offset) debugger
    }

    // if (this.offset > this.min) debugger
    // if (this.bits.length <= this.max - this.offset) debugger

    // if range now enclosed in the new bounds, loop through and clear the bits
    const oLeft = Math.max(this.min, left) - this.offset
    // if (oLeft < 0) debugger
    // if (oLeft >= this.bits.length) debugger
    // if (oRight < 0) debugger
    // if (oRight >= this.bits.length) debugger

    const oRight = Math.min(right, this.max) - this.offset
    for (let x = oLeft; x >= 0 && x < oRight; x += 1) {
      this.bits[x] = undefined
    }
  }
}

define(['dojo/_base/declare'], declare =>
  declare(null, {
    /**
     * @param args.pitchX  layout grid pitch in the X direction
     * @param args.pitchY  layout grid pitch in the Y direction
     * @param args.maxHeight  maximum layout height, default Infinity (no max)
     */
    constructor(args) {
      this.pitchX = args.pitchX || 10
      this.pitchY = args.pitchY || 10

      this.displayMode = args.displayMode

      // reduce the pitchY to try and pack the features tighter
      if (this.displayMode === 'compact') {
        this.pitchY = Math.round(this.pitchY / 4) || 1
        this.pitchX = Math.round(this.pitchX / 4) || 1
      }

      // console.log(`pitch: ${this.pitchX} / ${this.pitchY}`)

      this.bitmap = []
      this.rectangles = {}
      this.maxHeight = Math.ceil((args.maxHeight || Infinity) / this.pitchY)
      this.pTotalHeight = 0 // total height, in units of bitmap squares (px/pitchY)
    },

    /**
     * @returns {Number} top position for the rect, or Null if laying out the rect would exceed maxHeight
     */
    addRect(id, left, right, height, data) {
      // if we have already laid it out, return its layout
      if (id in this.rectangles) {
        const storedRec = this.rectangles[id]
        if (storedRec.top === null) return null

        // add it to the bitmap again, since that bitmap range may have been discarded
        this._addRectToBitmap(storedRec, data)
        return storedRec.top * this.pitchY
      }

      const pLeft = Math.floor(left / this.pitchX)
      const pRight = Math.floor(right / this.pitchX)
      const pHeight = Math.ceil(height / this.pitchY)

      const midX = Math.floor((pLeft + pRight) / 2)
      const rectangle = { id, l: pLeft, r: pRight, mX: midX, h: pHeight }
      if (data) rectangle.data = data

      const maxTop = this.maxHeight - pHeight
      let top = 0
      for (; top <= maxTop; top += 1) {
        if (!this._collides(rectangle, top)) break
      }

      if (top > maxTop) {
        rectangle.top = top = null
        this.rectangles[id] = rectangle
        this.pTotalHeight = Math.max(this.pTotalHeight || 0, top + pHeight)
        return null
      }
      rectangle.top = top
      this._addRectToBitmap(rectangle, data)
      this.rectangles[id] = rectangle
      this.pTotalHeight = Math.max(this.pTotalHeight || 0, top + pHeight)
      // console.log(`G2 ${data.get('name')} ${top}`)
      return top * this.pitchY
    },

    _collides(rect, top) {
      if (this.displayMode === 'collapsed') return false

      const bitmap = this.bitmap
      // var mY = top + rect.h/2; // Y midpoint: ( top+height  + top ) / 2

      // test exhaustively
      const maxY = top + rect.h
      for (let y = top; y < maxY; y += 1) {
        const row = bitmap[y]
        if (row && !row.isRangeClear(rect.l, rect.r)) {
          return true
        }
      }

      return false
    },

    /**
     * make a subarray if it does not exist
     * @private
     */
    _autovivifyRow(bitmap, y) {
      let row = bitmap[y]
      if (!row) {
        row = new LayoutRow(y)
        bitmap[y] = row
      }
      return row
    },

    _addRectToBitmap(rect, data) {
      if (rect.top === null) return

      data = data || true
      const bitmap = this.bitmap
      const av = this._autovivifyRow
      const yEnd = rect.top + rect.h
      if (rect.r - rect.l > maxFeaturePitchWidth) {
        // the rect is very big in relation to the view size, just
        // pretend, for the purposes of layout, that it extends
        // infinitely.  this will cause weird layout if a user
        // scrolls manually for a very, very long time along the
        // genome at the same zoom level.  but most users will not
        // do that.  hopefully.
        for (let y = rect.top; y < yEnd; y += 1) {
          av(bitmap, y).setAllFilled(data)
        }
      } else {
        for (let y = rect.top; y < yEnd; y += 1) {
          av(bitmap, y).addRect(rect, data)
        }
      }
    },

    /**
     *  Given a range of X coordinates, deletes all data dealing with
     *  the features.
     */
    discardRange(left, right) {
      // console.log( 'discard', left, right );
      const pLeft = Math.floor(left / this.pitchX)
      const pRight = Math.floor(right / this.pitchX)
      const bitmap = this.bitmap
      for (let y = 0; y < bitmap.length; y += 1) {
        const row = bitmap[y]
        if (row) row.discardRange(pLeft, pRight)
      }
    },

    hasSeen(id) {
      return !!this.rectangles[id]
    },

    getByCoord(x, y) {
      const pY = Math.floor(y / this.pitchY)
      const row = this.bitmap[pY]
      if (!row) return undefined
      const pX = Math.floor(x / this.pitchX)
      return row.getItemAt(pX)
    },

    getByID(id) {
      const r = this.rectangles[id]
      if (r) {
        return r.data || true
      }
      return undefined
    },

    cleanup() {},

    getTotalHeight() {
      return this.pTotalHeight * this.pitchY
    },
  }))
