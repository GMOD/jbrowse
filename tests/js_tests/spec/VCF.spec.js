require([
  'JBrowse/Browser',
  'JBrowse/Store/SeqFeature/VCFTabix',
  'JBrowse/Store/SeqFeature/VCFTribble',
], function (Browser, VCFStore, VCFTribble) {
  describe('VCF store', function () {
    xit('reads big dbsnp', function () {
      var store = new VCFStore({
        browser: new Browser({ unitTestMode: true }),
        config: {
          urlTemplate: '../../../data/big_vcf/00-All.vcf.gz',
          baseUrl: '.',
        },
        refSeq: { name: 'chr10', start: 0, end: 135534747 },
      })

      var features = []
      waitsFor(function () {
        return features.done
      })
      store.getFeatures(
        { ref: 'chr10', start: 33870887, end: 33896487 },
        function (f) {
          features.push(f)
        },
        function () {
          features.done = true
        },
        function (e) {
          console.error(e.stack || '' + e)
        },
      )
      runs(function () {
        expect(features.length).toEqual(560)
      })
    })

    it('reads gvcf * alleles', function () {
      var store = new VCFStore({
        browser: new Browser({ unitTestMode: true }),
        config: {
          urlTemplate: '../../docs/tutorial/data_files/gvcf.vcf.gz',
          baseUrl: '.',
        },
        refSeq: { name: 'ctgA', start: 0, end: 5000 },
      })

      var features = []
      waitsFor(function () {
        return features.done
      })
      store.getFeatures(
        { ref: 'ctgA', start: 0, end: 5000 },
        function (f) {
          features.push(f)
        },
        function () {
          features.done = true
        },
        function (e) {
          console.error(e.stack || '' + e)
        },
      )
      runs(function () {
        expect(features.length).toEqual(7)
        expect(features[2].get('alternative_alleles').values).toEqual([
          'TC',
          '<*>',
        ])
      })
    })

    it('no newline in VCF genotypes', function () {
      var store = new VCFStore({
        browser: new Browser({ unitTestMode: true }),
        config: {
          urlTemplate: '../../docs/tutorial/data_files/volvox.test.vcf.gz',
          baseUrl: '.',
        },
        refSeq: { name: 'ctgA', start: 0, end: 50000 },
      })

      var features = []
      waitsFor(function () {
        return features.done
      })
      store.getFeatures(
        { ref: 'ctgA', start: 0, end: 7000 },
        function (f) {
          features.push(f)
        },
        function () {
          features.done = true
        },
        function (e) {
          console.error(e.stack || '' + e)
        },
      )
      runs(function () {
        var gt = features[0].get('genotypes')
        var names = Object.keys(gt)
        var last = names[names.length - 1]
        expect(last.match('\n')).toEqual(null)
      })
    })

    it('reads gatk non_ref alleles', function () {
      var store = new VCFStore({
        browser: new Browser({ unitTestMode: true }),
        config: {
          urlTemplate: '../data/raw.g.vcf.gz',
          baseUrl: '.',
        },
        refSeq: { name: 'ctgA', start: 0, end: 5000 },
      })

      var features = []
      waitsFor(function () {
        return features.done
      })
      store.getFeatures(
        { ref: 'ctgA', start: 0, end: 100 },
        function (f) {
          features.push(f)
        },
        function () {
          features.done = true
        },
        function (e) {
          console.error(e.stack || '' + e)
        },
      )
      runs(function () {
        expect(features.length).toEqual(37)
        expect(features[0].get('alternative_alleles').values).toEqual([
          '<NON_REF>',
        ])
      })
    })

    it('parses END field', function () {
      var store = new VCFStore({
        browser: new Browser({ unitTestMode: true }),
        config: {
          urlTemplate: '../data/vcf.end.gz',
          baseUrl: '.',
        },
        refSeq: { name: '1', start: 0, end: 50000 },
      })

      var features = []
      waitsFor(function () {
        return features.done
      })
      store.getFeatures(
        { ref: '1', start: 0, end: 5000 },
        function (f) {
          features.push(f)
        },
        function () {
          features.done = true
        },
        function (e) {
          console.error(e.stack || '' + e)
        },
      )
      runs(function () {
        expect(features[0].get('end')).toEqual(4388)
        expect(features[1].get('end')).toEqual(4600)
        expect(features.length).toEqual(2)
      })
    })

    it('reads a CSI index', function () {
      var store = new VCFStore({
        browser: new Browser({ unitTestMode: true }),
        config: {
          urlTemplate: '../data/fake_large_chromosome/test.vcf.gz',
          csiUrlTemplate: '../data/fake_large_chromosome/test.vcf.gz.csi',
          baseUrl: '.',
        },
        refSeq: { name: '1', start: 1206808844, end: 1206851071 },
      })

      var features = []
      waitsFor(function () {
        return features.done
      })
      store.getFeatures(
        { ref: '1', start: 1206810422, end: 1206849288 },
        function (f) {
          features.push(f)
        },
        function () {
          features.done = true
        },
        function (e) {
          console.error(e.stack || '' + e)
        },
      )
      runs(function () {
        features.forEach(feature => {
          expect(feature.get('end')).toBeGreaterThan(1206808843)
          expect(feature.get('start')).toBeLessThan(12068510711)
          expect(feature.get('seq_id')).toEqual('1')
        })
        expect(features.length).toEqual(37)
        expect(features[0].data).toEqual({
          start: 1206810422,
          end: 1206810423,
          seq_id: '1',
          description: 'SNV T -> A',
          type: 'SNV',
          reference_allele: 'T',
          score: 25,
          alternative_alleles: {
            meta: {
              description:
                'VCF ALT field, list of alternate non-reference alleles called on at least one of the samples',
            },
            values: ['A'],
          },
          DP: {
            values: [19],
            meta: { Number: 1, Type: 'Integer', Description: 'Raw read depth' },
          },
          VDB: {
            values: [0.0404],
            meta: {
              Number: 1,
              Type: 'Float',
              Description: 'Variant Distance Bias',
            },
          },
          AF1: {
            values: [0.5],
            meta: {
              Number: 1,
              Type: 'Float',
              Description:
                'Max-likelihood estimate of the first ALT allele frequency (assuming HWE)',
            },
          },
          AC1: {
            values: [1],
            meta: {
              Number: 1,
              Type: 'Float',
              Description:
                'Max-likelihood estimate of the first ALT allele count (no HWE assumption)',
            },
          },
          DP4: {
            values: [3, 7, 3, 6],
            meta: {
              Number: 4,
              Type: 'Integer',
              Description:
                '# high-quality ref-forward bases, ref-reverse, alt-forward and alt-reverse bases',
            },
          },
          MQ: {
            values: [37],
            meta: {
              Number: 1,
              Type: 'Integer',
              Description: 'Root-mean-square mapping quality of covering reads',
            },
          },
          FQ: {
            values: [28],
            meta: {
              Number: 1,
              Type: 'Float',
              Description: 'Phred probability of all samples being the same',
            },
          },
          PV4: {
            values: [1, 1, 1, 0.27],
            meta: {
              Number: 4,
              Type: 'Float',
              Description:
                'P-values for strand bias, baseQ bias, mapQ bias and tail distance bias',
            },
          },
        })
        expect(features[0].get('genotypes')).toEqual({
          'sample_data/raw/volvox/volvox-sorted.bam': {
            GT: {
              values: ['0/1'],
            },
            PL: {
              values: [55, 0, 73],
            },
            GQ: {
              values: [58],
            },
          },
        })
      })
    })

    it('reads VCF tabix with dummy', function () {
      var store = new VCFStore({
        browser: new Browser({ unitTestMode: true }),
        config: {
          urlTemplate: '../../docs/tutorial/data_files/volvox.filtered.vcf.gz',
          tbiUrlTemplate: '../data/volvox.filtered.vcf.gz.tbi.has_dummy',
          baseUrl: '.',
        },
        refSeq: { name: 'ctgA', start: 0, end: 50000 },
      })

      var stats = {}
      waitsFor(function () {
        return stats.done
      })
      store.indexedData.lineCount('whatever').then(() => {
        store
          ._estimateGlobalStats({ name: 'ctgA', start: 0, end: 50000 })
          .then(function (f) {
            stats = f
            stats.done = true
          })
      })
      runs(function () {
        expect(stats.featureDensity).toBeCloseTo(0.0009)
      })
    })

    it('reads VCF tabix without dummy', function () {
      var store = new VCFStore({
        browser: new Browser({ unitTestMode: true }),
        config: {
          urlTemplate: '../../docs/tutorial/data_files/volvox.filtered.vcf.gz',
          tbiUrlTemplate: '../data/volvox.filtered.vcf.gz.tbi.no_dummy',
          baseUrl: '.',
        },
        refSeq: { name: 'ctgA', start: 0, end: 50000 },
      })

      var stats = {}
      waitsFor(function () {
        return stats.done
      })

      store
        ._estimateGlobalStats({ name: 'ctgA', start: 0, end: 50000 })
        .then(function (f) {
          stats = f
          stats.done = true
        })

      runs(function () {
        expect(stats.featureDensity).toBeCloseTo(0.0009)
      })
    })

    it('large VCF header fetches whole header', function () {
      var store = new VCFStore({
        browser: new Browser({ unitTestMode: true }),
        config: {
          urlTemplate: '../data/large_vcf_header/large_vcf_header.vcf.gz',
          baseUrl: '.',
        },
        refSeq: { name: 'LcChr1', start: 0, end: 1000 },
      })

      var header
      var parsedHeader
      waitsFor(() => header)
      waitsFor(() => parsedHeader)
      store.indexedData.getHeader().then(h => {
        header = h
      })
      store
        .getParser()
        .then(parser => parser.getMetadata('bcftools_callCommand'))
        .then(h => {
          parsedHeader = h
        })
      runs(function () {
        expect(header.length).toEqual(5315655)
        expect(parsedHeader).toEqual('call -A -m -v 350_LcChr1.bcf')
      })
    })

    it('large VCF header fetches features', function () {
      var store = new VCFStore({
        browser: new Browser({ unitTestMode: true }),
        config: {
          urlTemplate: '../data/large_vcf_header/large_vcf_header.vcf.gz',
          baseUrl: '.',
        },
        refSeq: { name: 'LcChr1', start: 0, end: 1000 },
      })

      var features = []
      waitsFor(function () {
        return features.done
      })
      store.getFeatures(
        { ref: 'LcChr1', start: 1, end: 10000 },
        function (f) {
          features.push(f)
        },
        function () {
          features.done = true
        },
        function (e) {
          console.error(e.stack || '' + e)
        },
      )
      runs(function () {
        var a = features[0].get('genotypes')
        expect(Object.keys(a).length).toBeTruthy() // expect non empty object
      })
    })

    it('can read a tribble-indexed file', function () {
      const store = new VCFTribble({
        browser: new Browser({ unitTestMode: true }),
        config: {
          urlTemplate:
            '../data/1801160099-N32519_26611_S51_56704.hard-filtered.vcf',
          idxUrlTemplate:
            '../data/1801160099-N32519_26611_S51_56704.hard-filtered.vcf.idx',
          baseUrl: '.',
        },
      })
      var items = []
      store.getFeatures(
        {
          ref: '17',
          start: 41200000,
          end: 41290000,
        },
        i => {
          items.push(i)
        },
        () => {
          items.done = true
        },
        e => {
          console.error(e.stack || '' + e)
        },
      )

      waitsFor(function () {
        return items.done
      })
      runs(function () {
        expect(items.length).toEqual(9)
        items.forEach(function (item, i) {
          expect(item.data.seq_id).toEqual('17')
          expect(item.data.start).toBeGreaterThan(41200000)
          expect(item.data.start).toBeLessThan(41290000)
        })
      })
    })
  })
})
