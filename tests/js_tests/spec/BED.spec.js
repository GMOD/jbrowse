require([
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/request/xhr',
  'JBrowse/Browser',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Store/SeqFeature/BED',
], function (array, lang, xhr, Browser, XHRBlob, BEDStore) {
  describe('BED store', function () {
    it('can parse BED-6', function () {
      var p = new BEDStore({
        browser: new Browser({ unitTestMode: true }),
        blob: new XHRBlob('../../sample_data/raw/volvox/volvox-remark.bed'),
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
    it('can parse BED-3', function () {
      var p = new BEDStore({
        browser: new Browser({ unitTestMode: true }),
        blob: new XHRBlob('../data/volvox.sort.bed'),
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
          expect(features.length).toEqual(109)
        })
      }).call()
    })
  })
})
