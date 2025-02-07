/* The function to parse the bed files. The standard BED file format (BED-6) is "chr\tstart(0based)\tEnd(1based)\tname\tscore\tstrand

BED-3 is the minimal parsed line by this parser (i.e. includes only first three fields)
Optional header lines start with '#'
*/
define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'JBrowse/Util/TextIterator',
], function (declare, array, lang, TextIterator) {
  var bed_feature_names = 'seq_id start end name score strand'.split(' ')

  return declare(null, {
    constructor: function (args) {
      lang.mixin(this, {
        featureCallback: args.featureCallback || function () {},
        endCallback: args.endCallback || function () {},
        commentCallback: args.commentCallback || function () {},
        errorCallback:
          args.errorCallback ||
          function (e) {
            console.error(e)
          },
        store: args.store,
        // if this is true, the parser ignores the
        // rest of the lines in the file.  currently
        // set when the file switches over to FASTA
        eof: false,
      })
    },

    /**
     * Parse the bytes that contain the BED header, storing the parsed
     * data in this.header.
     */
    parseHeader: function (headerBytes) {
      // parse the header lines
      var headData = {}
      var lineIterator = new TextIterator.FromBytes({
        bytes: headerBytes,
      })
      var line
      while ((line = lineIterator.getline())) {
        // only interested in meta and header lines
        if (line[0] != '#') continue

        // parse meta line using the parseHeader configuration callback function
        var metaData = (this.config.parseHeader || function () {})(line)
        var key = metaData.key
        headData[key] = metaData.value
      }

      this.header = headData
      return headData
    },
    finish: function () {
      this.endCallback()
    },
    addLine: function (line) {
      var match
      if (this.eof) {
        // do nothing
      } else if (/^\s*[^#\s>]/.test(line)) {
        //< feature line, most common case
        line = line.replace(/\r?\n?$/g, '')
        var f = this.parse_feature(line)
        this.featureCallback(this._return_item([f]))
      }
      // directive or comment
      else if ((match = /^\s*(\#+)(.*)/.exec(line))) {
        var hashsigns = match[1],
          contents = match[2]
        contents = contents.replace(/\s*/, '')
        this._return_item({ comment: contents })
      } else if (/^\s*$/.test(line)) {
        // blank line, do nothing
      } else if (/^\s*>/.test(line)) {
        // implicit beginning of a FASTA section.  just stop
        // parsing, since we don't currently handle sequences
        this._return_all_under_construction_features()
        this.eof = true
      } else {
        // it's a parse error
        line = line.replace(/\r?\n?$/g, '')
        throw "GFF3 parse error.  Cannot parse '" + line + "'."
      }
    },

    unescape(s) {
      if (s === null) return null

      return s.replace(/%([0-9A-Fa-f]{2})/g, function (match, seq) {
        return String.fromCharCode(parseInt(seq, 16))
      })
    },

    parse_feature: function (line) {
      var f = array.map(line.split('\t'), function (a) {
        if (a == '.') {
          return null
        }
        return a
      })

      // unescape only the ref and source columns
      f[0] = this.unescape(f[0])

      var parsed = {}
      for (var i = 0; i < bed_feature_names.length; i++) {
        if (f[i]) {
          parsed[bed_feature_names[i]] = f[i] == '.' ? null : f[i]
        }
      }
      if (parsed.start !== null) parsed.start = parseInt(parsed.start, 10)
      if (parsed.end !== null) parsed.end = parseInt(parsed.end, 10)
      if (parsed.score != null) parsed.score = parseFloat(parsed.score, 10)

      parsed.strand = { '+': 1, '-': -1 }[parsed.strand] || 0

      return parsed
    },

    _return_item: function (i) {
      if (i[0]) this.featureCallback(i)
      else if (i.comment) this.commentCallback(i, this.store)
    },
  })
})
