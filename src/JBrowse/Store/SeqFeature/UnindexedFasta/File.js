define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/Deferred',
  'JBrowse/has',
  'JBrowse/Util',
  'JBrowse/Errors',
  'JBrowse/Model/SimpleFeature',
], function (declare, array, Deferred, has, Util, Errors, SimpleFeature) {
  return declare(null, {
    constructor: function (args) {
      this.store = args.store
      this.data = args.data
      this.features = {}
      this.refseqs = []
    },

    init: function (args) {
      var fasta = this.data
      var thisB = this
      var successCallback = args.success || function () {}
      var failCallback =
        args.failure ||
        function (e) {
          console.error(e, e.stack)
        }
      this.parseFile(
        fasta,
        function (data) {
          array.forEach(data, function (rs) {
            thisB.features[rs.name] = {
              seq_id: rs.name,
              name: rs.name,
              start: 0,
              end: rs.seq.length,
              seq: rs.seq,
            }
            thisB.refseqs.push({
              name: rs.name,
              start: 0,
              end: rs.seq.length,
              length: rs.seq.length,
            })
          })

          successCallback()
        },
        failCallback,
      )
    },

    fetch: function (chr, min, max, featCallback, endCallback, errorCallback) {
      errorCallback =
        errorCallback ||
        function (e) {
          console.error(e)
        }
      var refname = chr
      if (!this.store.browser.compareReferenceNames(chr, refname)) {
        refname = chr
      }
      featCallback(
        new SimpleFeature({
          data: {
            start: this.features[refname].start,
            end: this.features[refname].end,
            residues: this.features[refname].seq,
            seq_id: refname,
            name: refname,
          },
        }),
      )

      endCallback()
    },

    parseFile: function (fastaFile, successCallback, failCallback) {
      this.data.fetch(
        dojo.hitch(this, function (text) {
          var fastaString = ''
          var bytes = new Uint8Array(text)
          var length = bytes.length
          for (var i = 0; i < length; i++) {
            fastaString += String.fromCharCode(bytes[i])
          }

          if (!(fastaString && fastaString.length)) {
            failCallback(`Could not read file: ${fastaFile.name}`)
          } else {
            var data = this.parseString(fastaString)
            if (!data.length) {
              failCallback('File contained no (FASTA) sequences')
            } else {
              successCallback(data)
            }
          }
        }),
        failCallback,
      )
    },

    parseString: function (fastaString) {
      var data = []
      var addSeq = function (s) {
        if ('name' in s && s.seq.length) {
          // ignore empty sequences
          data.push(s)
        }
      }
      var current = { seq: '' }
      var lines = fastaString.match(/^.*((\r\n|\n|\r)|$)/gm) // this is wasteful, maybe try to avoid storing split lines separately later

      for (var i = 0; i < lines.length; i++) {
        var m
        if ((m = /^>(\S*)/.exec(lines[i]))) {
          addSeq(current)
          current = { seq: '' }
          if (m[1].length) {
            current.name = m[1]
          }
        } else if ((m = /^\s*(\S+)\s*$/.exec(lines[i]))) {
          current.seq += m[1]
        }
      }
      addSeq(current)

      return data
    },
  })
})
