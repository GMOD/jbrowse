/* global dojo */
require([
  'dojo/aspect',
  'dojo/_base/declare',
  'dojo/_base/array',
  'JBrowse/Browser',
  'JBrowse/FeatureFiltererMixin',
  'JBrowse/Store/SeqFeature/CRAM',
  'JBrowse/Model/XHRBlob',
], function (
  aspect,
  declare,
  array,
  Browser,
  FeatureFiltererMixin,
  CRAMStore,
  XHRBlob,
) {
  describe('CRAM with volvox-sorted.cram', function () {
    var b
    beforeEach(function () {
      var browser = new Browser({ unitTestMode: true, stores: {} })
      b = new CRAMStore({
        browser: browser,
        cram: new XHRBlob('../../sample_data/raw/volvox/volvox-sorted.cram'),
        crai: new XHRBlob(
          '../../sample_data/raw/volvox/volvox-sorted.cram.crai',
        ),
        refSeq: { name: 'ctgA', start: 1, end: 500001 },
      })
    })

    it('constructs', function () {
      expect(b).toBeTruthy()
    })

    it('loads some data contigA', function () {
      var loaded
      var features = []
      var done
      aspect.after(b, 'loadSuccess', function () {
        loaded = true
      })
      b.getFeatures(
        { start: 0, end: 50000, name: 'contigA' },
        function (feature) {
          features.push(feature)
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
      }, 2000)
      runs(function () {
        expect(features.length).toBeGreaterThan(1000)
      })
    })

    it('loads some data ctgA', function () {
      var loaded
      var features = []
      var done
      aspect.after(b, 'loadSuccess', function () {
        loaded = true
      })
      b.getFeatures(
        { start: 0, end: 50000, name: 'ctgA' },
        function (feature) {
          features.push(feature)
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
      }, 2000)
      runs(function () {
        expect(features.length).toBeGreaterThan(1000)
      })
    })
  })
})
