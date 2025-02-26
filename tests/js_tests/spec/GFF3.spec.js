require([
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/request/xhr',
  'JBrowse/Browser',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Store/SeqFeature/GFF3',
], function (array, lang, xhr, Browser, XHRBlob, GFF3Store) {
  describe('GFF3 store', function () {
    it('can parse volvox.gff3', function () {
      var p = new GFF3Store({
        browser: new Browser({ unitTestMode: true }),
        blob: new XHRBlob('../../sample_data/raw/volvox/volvox.gff3'),
        refSeq: { name: 'ctgA', start: 0, end: 50001 },
      })
      ;(function () {
        var features = []
        var done

        p.getFeatures(
          { ref: 'ctgA', start: 1, end: 50000 },
          function (f) {
            features.push(f)
          },
          function () {
            done = true
          },
          function (e) {
            console.error(e)
          },
        )

        waitsFor(function () {
          return done
        })
        runs(function () {
          //console.log( features );
          expect(features.length).toEqual(197)
          var edenIndex
          array.some(features, function (f, i) {
            if (f.get('name') == 'EDEN') {
              edenIndex = i
              return true
            }
            return false
          })
          expect(edenIndex).toBeGreaterThan(3)
          expect(edenIndex).toBeLessThan(7)
          expect(features[edenIndex].get('subfeatures').length).toEqual(3)
          expect(
            features[edenIndex].get('subfeatures')[0].get('subfeatures').length,
          ).toEqual(6)
        })
      }).call()

      ;(function () {
        var features = []
        var done

        p.getFeatures(
          { ref: 'ctgA', start: -1, end: 2499 },
          function (f) {
            features.push(f)
          },
          function () {
            done = true
          },
          function (e) {
            console.error(e)
          },
        )

        waitsFor(function () {
          return done
        })
        runs(function () {
          //console.log( features );
          expect(features.length).toEqual(13)
          // expect( features[191].get('subfeatures').length ).toEqual( 3 );
          // expect( features[191].get('subfeatures')[0].get('subfeatures').length ).toEqual( 6 );
        })
      }).call()

      ;(function () {
        var features = []
        var done

        p.getFeatures(
          { ref: 'ctgB', start: -1, end: 5000 },
          function (f) {
            features.push(f)
          },
          function () {
            done = true
          },
          function (e) {
            console.error(e)
          },
        )

        waitsFor(function () {
          return done
        })
        runs(function () {
          //console.log( features );
          expect(features.length).toEqual(4)
          // expect( features[191].get('subfeatures').length ).toEqual( 3 );
          // expect( features[191].get('subfeatures')[0].get('subfeatures').length ).toEqual( 6 );
          expect(features[3].get('note')).toEqual(
            'ああ、この機能は、世界中を旅しています！',
          )
        })
      }).call()
    })
  })
})
