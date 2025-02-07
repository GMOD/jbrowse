require([
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/request/xhr',
  'JBrowse/Browser',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Store/SeqFeature/BEDTabix',
], function (array, lang, xhr, Browser, XHRBlob, BEDTabixStore) {
  describe('BED store', function () {
    it('can parse BED-6 tabix', function () {
      var p = new BEDTabixStore({
        browser: new Browser({ unitTestMode: true }),
        file: new XHRBlob('../data/volvox-remark.bed.gz'),
        tbi: new XHRBlob('../data/volvox-remark.bed.gz.tbi'),
        refSeq: { name: 'ctgA', start: 0, end: 50001 },
      })
      ;(function () {
        var features = []
        p.getFeatures(
          { ref: 'ctgA', start: 1, end: 50000 },
          function (f) {
            features.push(f)
          },
          function () {
            features.done = true
          },
          function (e) {
            console.error(e.stack || `${e}`)
          },
        )

        waitsFor(function () {
          return features.done
        })
        runs(function () {
          expect(features.length).toEqual(16)
          var c = 0
          features.forEach(function (elt) {
            c += elt.get('strand') == 1
          })
          expect(c).toEqual(9)
          var d = 0
          features.forEach(function (elt) {
            d += elt.get('strand') == -1
          })
          expect(d).toEqual(6)
          var e = 0
          features.forEach(function (elt) {
            e += elt.get('strand') == 0
          })
          expect(e).toEqual(1)
        })
      }).call()
    })
    it('can parse BED-3 tabix', function () {
      var p = new BEDTabixStore({
        browser: new Browser({ unitTestMode: true }),
        file: new XHRBlob('../../sample_data/raw/volvox/volvox.sort.bed.gz.1'),
        tbi: new XHRBlob('../../sample_data/raw/volvox/volvox.sort.bed.gz.tbi'),
        refSeq: { name: 'ctgA', start: 0, end: 50001 },
      })
      ;(function () {
        var features = []
        p.getFeatures(
          { ref: 'ctgA', start: 1, end: 50000 },
          function (f) {
            features.push(f)
          },
          function () {
            features.done = true
          },
          function (e) {
            console.error(e.stack || `${e}`)
          },
        )

        waitsFor(function () {
          return features.done
        })
        runs(function () {
          //console.log( features );
          expect(features.length).toEqual(109)
        })
      }).call()
    })
  })
})
