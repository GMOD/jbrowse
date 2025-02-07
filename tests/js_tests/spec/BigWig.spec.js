require([
  'JBrowse/Browser',
  'JBrowse/Store/BigWig',
  'JBrowse/Model/XHRBlob',
], function (Browser, BigWig, XHRBlob) {
  var errorFunc = function (e) {
    console.error(e)
  }

  describe('BigWig with volvox_microarray.bw', function () {
    var browser = new Browser({ unitTestMode: true })
    var b = new BigWig({
      browser: browser,
      blob: new XHRBlob('../../sample_data/raw/volvox/volvox_microarray.bw'),
    })

    it('constructs', function () {
      expect(b).toBeTruthy()
    })

    it('returns empty array of features for a nonexistent chrom', function () {
      var v = b.getUnzoomedView()
      var wigData
      v.readWigData(
        'nonexistent',
        1,
        10000,
        function (features) {
          wigData = features
        },
        errorFunc,
      )
      waitsFor(function () {
        return wigData
      })
      runs(function () {
        expect(wigData.length).toEqual(0)
      })
    })
    it('reads some good data unzoomed', function () {
      var v = b.getUnzoomedView()
      var wigData
      v.readWigData(
        browser.regularizeReferenceName('ctgA'),
        0,
        10000,
        function (features) {
          wigData = features
        },
        errorFunc,
      )
      waitsFor(function () {
        return wigData
      }, 1000)
      runs(function () {
        expect(wigData.length).toBeGreaterThan(100)
        wigData.slice(1, 20).forEach(feature => {
          expect(feature.get('start')).toBeGreaterThan(0)
          expect(feature.get('end')).toBeLessThan(10000)
        })
        //console.log(wigData);
      })
    })

    it('reads some good data when zoomed out', function () {
      var v = b.getView(1 / 20000)
      var wigData
      v.readWigData(
        browser.regularizeReferenceName('ctgA'),
        100,
        20000,
        function (features) {
          wigData = features
        },
        errorFunc,
      )
      waitsFor(function () {
        return wigData
      }, 500)
      runs(function () {
        expect(wigData.length).toEqual(2)
        wigData.forEach(feature => {
          expect(feature.get('start')).toBeGreaterThan(-1)
          expect(feature.get('end')).toBeLessThan(40000)
        })
        //console.log(wigData);
      })
    })

    it('reads the file stats (the totalSummary section)', function () {
      var stats
      b.getGlobalStats(function (s) {
        stats = s
      })
      waitsFor(function () {
        return stats
      })
      runs(function () {
        //console.log(stats);
        expect(stats.basesCovered).toEqual(50690)
        expect(stats.scoreMin).toEqual(100)
        expect(stats.scoreMax).toEqual(899)
        expect(stats.scoreSum).toEqual(16863706)
        expect(stats.scoreSumSquares).toEqual(8911515204)
        expect(stats.scoreStdDev).toEqual(255.20080383762445)
        expect(stats.scoreMean).toEqual(332.6830933122904)
      })
    })

    it('reads good data when zoomed very little', function () {
      var v = b.getView(1 / 17.34)
      var wigData
      v.readWigData(
        browser.regularizeReferenceName('ctgA'),
        19999,
        24999,
        function (features) {
          wigData = features
        },
        errorFunc,
      )
      waitsFor(function () {
        return wigData
      }, 1000)
      runs(function () {
        expect(wigData.length).toBeGreaterThan(19)
        expect(wigData.length).toBeLessThan(1000)
        wigData.forEach(feature => {
          expect(feature.get('start')).toBeGreaterThan(10000)
          expect(feature.get('end')).toBeLessThan(30000)
        })
        //console.log(wigData);
      })
    })
  })

  describe('empty BigWig file', function () {
    var browser = new Browser({ unitTestMode: true })
    var b = new BigWig({
      browser: browser,
      blob: new XHRBlob('../data/empty.bigWig'),
    })

    it('constructs', function () {
      expect(b).toBeTruthy()
    })

    it('returns empty array of features for a nonexistent chrom', function () {
      var v = b.getUnzoomedView()
      var wigData
      v.readWigData(
        'nonexistent',
        1,
        10000,
        function (features) {
          wigData = features
        },
        errorFunc,
      )
      waitsFor(function () {
        return wigData
      })
      runs(function () {
        expect(wigData.length).toEqual(0)
      })
    })
    it('reads some good data unzoomed', function () {
      var v = b.getUnzoomedView()
      var wigData
      v.readWigData(
        browser.regularizeReferenceName('ctgA'),
        0,
        10000,
        function (features) {
          wigData = features
        },
        errorFunc,
      )
      waitsFor(function () {
        return wigData
      }, 1000)
      runs(function () {
        expect(wigData.length).toEqual(0)
      })
    })

    it('reads some good data when zoomed out', function () {
      var v = b.getView(1 / 20000)
      var wigData
      v.readWigData(
        browser.regularizeReferenceName('ctgA'),
        100,
        20000,
        function (features) {
          wigData = features
        },
        errorFunc,
      )
      waitsFor(function () {
        return wigData
      }, 500)
      runs(function () {
        expect(wigData.length).toEqual(0)
      })
    })

    it('reads the file stats (the totalSummary section)', function () {
      var stats
      b.getGlobalStats(function (s) {
        stats = s
      })
      waitsFor(function () {
        return stats
      })
      runs(function () {
        console.log(stats)
        expect(stats.basesCovered).toEqual(0)
        expect(stats.scoreMin).toEqual(0)
        expect(stats.scoreMax).toEqual(3)
        expect(stats.scoreSum).toEqual(0)
        expect(stats.scoreSumSquares).toEqual(0)
        expect(stats.scoreStdDev).toEqual(0)
        expect(stats.scoreMean).toEqual(0)
      })
    })

    it('reads good data when zoomed very little', function () {
      var v = b.getView(1 / 17.34)
      var wigData
      v.readWigData(
        browser.regularizeReferenceName('ctgA'),
        19999,
        24999,
        function (features) {
          wigData = features
        },
        errorFunc,
      )
      waitsFor(function () {
        return wigData
      }, 1000)
      runs(function () {
        expect(wigData.length).toEqual(0)
      })
    })
  })

  // only run the tomato_rnaseq test if it's in the URL someplace
  if (document.location.href.indexOf('tomato_rnaseq') > -1) {
    describe('BigWig with tomato RNAseq coverage', function () {
      var b = new BigWig({
        browser: new Browser({ unitTestMode: true }),
        blob: new XHRBlob('../data/SL2.40_all_rna_seq.v1.bigwig'),
      })

      it('constructs', function () {
        expect(b).toBeTruthy()
      })

      it('returns empty array of features for a nonexistent chrom', function () {
        var v = b.getUnzoomedView()
        var wigData
        v.readWigData('nonexistent', 1, 10000, function (features) {
          wigData = features
        })
        waitsFor(function () {
          return wigData
        })
        runs(function () {
          expect(wigData.length).toEqual(0)
        })
      })

      it('reads some good data unzoomed', function () {
        var v = b.getUnzoomedView()
        var wigData
        v.readWigData('SL2.40ch01', 1, 100000, function (features) {
          wigData = features
        })
        waitsFor(function () {
          return wigData
        }, 1000)
        runs(function () {
          expect(wigData.length).toBeGreaterThan(10000)
          wigData.slice(0, 20).forEach(feature => {
            expect(feature.get('start')).toBeGreaterThan(0)
            expect(feature.get('end')).toBeLessThan(100001)
          })
          //console.log(wigData);
        })
      })

      it('reads some good data when zoomed', function () {
        var v = b.getView(1 / 100000)
        var wigData
        v.readWigData('SL2.40ch01', 100000, 2000000, function (features) {
          wigData = features
        })
        waitsFor(function () {
          return wigData
        }, 1000)
        runs(function () {
          expect(wigData.length).toBeGreaterThan(19)
          expect(wigData.length).toBeLessThan(100)
          wigData.forEach(feature => {
            expect(feature.get('start')).toBeGreaterThan(80000)
            expect(feature.get('end')).toBeLessThan(2050000)
          })
          //console.log(wigData);
        })
      })

      it('reads the file stats (the totalSummary section)', function () {
        var stats = b.getGlobalStats()
        expect(stats.basesCovered).toEqual(141149153)
        expect(stats.minVal).toEqual(1)
        expect(stats.maxVal).toEqual(62066)
        expect(stats.sumData).toEqual(16922295025)
        expect(stats.sumSquares).toEqual(45582937421360)
        expect(stats.stdDev).toEqual(555.4891087210976)
        expect(stats.mean).toEqual(119.88945498666932)
      })

      it('reads good data when zoomed very little', function () {
        var v = b.getView(1 / 17.34)
        var wigData
        v.readWigData('SL2.40ch01', 19999, 24999, function (features) {
          wigData = features
        })
        waitsFor(function () {
          return wigData
        }, 1000)
        runs(function () {
          expect(wigData.length).toBeGreaterThan(19)
          expect(wigData.length).toBeLessThan(1000)
          wigData.forEach(feature => {
            expect(feature.get('start')).toBeGreaterThan(10000)
            expect(feature.get('end')).toBeLessThan(30000)
          })
          //console.log(wigData);
        })
      })
    })
  }
})
