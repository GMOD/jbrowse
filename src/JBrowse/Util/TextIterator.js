/**
 * Classes to iterate over records in an array-like structure of bytes (FromBytes).
 */

define([], function () {
  var FromBytes = function (args) {
    this.bytes = args.bytes
    this.offset = args.offset || 0
    this.length = args.length || this.bytes.length
    this._recordSeparator = (args.inputRecordSeparator || '\n').charCodeAt(0)
    this.returnPartialRecord = args.returnPartialRecord
  }

  FromBytes.prototype.getOffset = function () {
    return this.offset
  }

  // get a line of text, properly decoding UTF-8
  FromBytes.prototype.getline = function () {
    var bytes = this.bytes
    var i = this.offset

    var line = []
    while (i < this.length) {
      var c1 = bytes[i],
        c2,
        c3
      if (c1 < 128) {
        line.push(String.fromCharCode(c1))
        i++
        if (c1 == this._recordSeparator) {
          this.offset = i
          return line.join('')
        }
      } else if (c1 > 191 && c1 < 224) {
        c2 = bytes[i + 1]
        line.push(String.fromCharCode(((c1 & 31) << 6) | (c2 & 63)))
        i += 2
      } else {
        c2 = bytes[i + 1]
        c3 = bytes[i + 2]
        line.push(
          String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63)),
        )
        i += 3
      }
    }

    // did not get a full line
    this.offset = i
    // return our partial line if we are set to return partial records
    return this.returnPartialRecord ? line.join('') : null
  }

  return {
    FromBytes: FromBytes,
  }
})
