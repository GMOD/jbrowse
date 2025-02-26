require([
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/request/xhr',
  'JBrowse/Browser',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Store/SeqFeature/GFF3Tabix',
], function (array, lang, xhr, Browser, XHRBlob, GFF3TabixStore) {
  describe('GFF3 tabix store', function () {
    it('can parse volvox_tabix.gff3.gz', function () {
      var p = new GFF3TabixStore({
        browser: new Browser({ unitTestMode: true }),
        file: new XHRBlob('../../sample_data/raw/volvox/volvox.sort.gff3.gz.1'),
        tbi: new XHRBlob(
          '../../sample_data/raw/volvox/volvox.sort.gff3.gz.tbi',
        ),
        refSeq: { name: 'ctgA', start: 0, end: 50001 },
      })

      const [rangeStart, rangeEnd] = [1055, 2500]

      var features = []
      p.getFeatures(
        { ref: 'ctgA', start: rangeStart, end: rangeEnd },
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

      waitsFor(function () {
        return features.done
      })
      runs(function () {
        expect(features.length).toEqual(12)
        //console.log(JSON.stringify(features,undefined,2))

        // check that every top-level feature overlaps the fetched range
        features.forEach(feature => {
          expect(feature.get('start')).toBeLessThan(rangeEnd)
          expect(feature.get('end')).toBeGreaterThan(rangeStart)
        })

        let isEden = f => f.get('name') === 'EDEN'
        expect(features.filter(isEden).length).toEqual(1)
        let eden = features.find(isEden)
        // console.log(JSON.stringify(eden,undefined,4))
        // we should still get all the subfeatures of EDEN, some of which lie
        // entirely outside of the queried range
        expect(JSON.stringify(eden)).toEqual(
          JSON.stringify({
            data: {
              seq_id: 'ctgA',
              source: 'example',
              type: 'gene',
              start: 1049,
              end: 9000,
              score: null,
              strand: 1,
              phase: null,
              id: 'EDEN',
              name: 'EDEN',
              note: 'protein kinase',
              uniqueID: 'offset-781898',
              subfeatures: [
                {
                  data: {
                    seq_id: 'ctgA',
                    source: 'example',
                    type: 'mRNA',
                    start: 1049,
                    end: 9000,
                    score: null,
                    strand: 1,
                    phase: null,
                    id: 'EDEN.1',
                    parent: 'EDEN',
                    name: 'EDEN.1',
                    note: 'Eden splice form 1',
                    index: '1',
                    uniqueID: 'offset-781970',
                    subfeatures: [
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'five_prime_UTR',
                          start: 1049,
                          end: 1200,
                          score: null,
                          strand: 1,
                          phase: null,
                          parent: 'EDEN.1',
                          uniqueID: 'offset-782170',
                        },
                        _uniqueID: 'offset-782170',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'CDS',
                          start: 1200,
                          end: 1500,
                          score: null,
                          strand: 1,
                          phase: '0',
                          parent: 'EDEN.1',
                          uniqueID: 'offset-782609',
                        },
                        _uniqueID: 'offset-782609',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'CDS',
                          start: 2999,
                          end: 3902,
                          score: null,
                          strand: 1,
                          phase: '0',
                          parent: 'EDEN.1',
                          uniqueID: 'offset-783173',
                        },
                        _uniqueID: 'offset-783173',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'CDS',
                          start: 4999,
                          end: 5500,
                          score: null,
                          strand: 1,
                          phase: '0',
                          parent: 'EDEN.1',
                          uniqueID: 'offset-783652',
                        },
                        _uniqueID: 'offset-783652',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'CDS',
                          start: 6999,
                          end: 7608,
                          score: null,
                          strand: 1,
                          phase: '0',
                          parent: 'EDEN.1',
                          uniqueID: 'offset-784457',
                        },
                        _uniqueID: 'offset-784457',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'three_prime_UTR',
                          start: 7608,
                          end: 9000,
                          score: null,
                          strand: 1,
                          phase: null,
                          parent: 'EDEN.1',
                          uniqueID: 'offset-784783',
                        },
                        _uniqueID: 'offset-784783',
                      },
                    ],
                  },
                  _uniqueID: 'offset-781970',
                },
                {
                  data: {
                    seq_id: 'ctgA',
                    source: 'example',
                    type: 'mRNA',
                    start: 1049,
                    end: 9000,
                    score: null,
                    strand: 1,
                    phase: null,
                    id: 'EDEN.2',
                    parent: 'EDEN',
                    name: 'EDEN.2',
                    note: 'Eden splice form 2',
                    index: '1',
                    uniqueID: 'offset-782070',
                    subfeatures: [
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'five_prime_UTR',
                          start: 1049,
                          end: 1200,
                          score: null,
                          strand: 1,
                          phase: null,
                          parent: 'EDEN.2',
                          uniqueID: 'offset-782228',
                        },
                        _uniqueID: 'offset-782228',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'CDS',
                          start: 1200,
                          end: 1500,
                          score: null,
                          strand: 1,
                          phase: '0',
                          parent: 'EDEN.2',
                          uniqueID: 'offset-782656',
                        },
                        _uniqueID: 'offset-782656',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'CDS',
                          start: 4999,
                          end: 5500,
                          score: null,
                          strand: 1,
                          phase: '0',
                          parent: 'EDEN.2',
                          uniqueID: 'offset-783699',
                        },
                        _uniqueID: 'offset-783699',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'CDS',
                          start: 6999,
                          end: 7608,
                          score: null,
                          strand: 1,
                          phase: '0',
                          parent: 'EDEN.2',
                          uniqueID: 'offset-784504',
                        },
                        _uniqueID: 'offset-784504',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'three_prime_UTR',
                          start: 7608,
                          end: 9000,
                          score: null,
                          strand: 1,
                          phase: null,
                          parent: 'EDEN.2',
                          uniqueID: 'offset-784842',
                        },
                        _uniqueID: 'offset-784842',
                      },
                    ],
                  },
                  _uniqueID: 'offset-782070',
                },
                {
                  data: {
                    seq_id: 'ctgA',
                    source: 'example',
                    type: 'mRNA',
                    start: 1299,
                    end: 9000,
                    score: null,
                    strand: 1,
                    phase: null,
                    id: 'EDEN.3',
                    parent: 'EDEN',
                    name: 'EDEN.3',
                    note: 'Eden splice form 3',
                    index: '1',
                    uniqueID: 'offset-782703',
                    subfeatures: [
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'five_prime_UTR',
                          start: 1299,
                          end: 1500,
                          score: null,
                          strand: 1,
                          phase: null,
                          parent: 'EDEN.3',
                          uniqueID: 'offset-782803',
                        },
                        _uniqueID: 'offset-782803',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'five_prime_UTR',
                          start: 2999,
                          end: 3300,
                          score: null,
                          strand: 1,
                          phase: null,
                          parent: 'EDEN.3',
                          uniqueID: 'offset-783220',
                        },
                        _uniqueID: 'offset-783220',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'CDS',
                          start: 3300,
                          end: 3902,
                          score: null,
                          strand: 1,
                          phase: '0',
                          parent: 'EDEN.3',
                          uniqueID: 'offset-783352',
                        },
                        _uniqueID: 'offset-783352',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'CDS',
                          start: 4999,
                          end: 5500,
                          score: null,
                          strand: 1,
                          phase: '1',
                          parent: 'EDEN.3',
                          uniqueID: 'offset-783746',
                        },
                        _uniqueID: 'offset-783746',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'CDS',
                          start: 6999,
                          end: 7600,
                          score: null,
                          strand: 1,
                          phase: '1',
                          parent: 'EDEN.3',
                          uniqueID: 'offset-784410',
                        },
                        _uniqueID: 'offset-784410',
                      },
                      {
                        data: {
                          seq_id: 'ctgA',
                          source: 'example',
                          type: 'three_prime_UTR',
                          start: 7600,
                          end: 9000,
                          score: null,
                          strand: 1,
                          phase: null,
                          parent: 'EDEN.3',
                          uniqueID: 'offset-784724',
                        },
                        _uniqueID: 'offset-784724',
                      },
                    ],
                  },
                  _uniqueID: 'offset-782703',
                },
              ],
            },
            _uniqueID: 'EDEN',
            _reg_seq_id: 'ctga',
          }),
        )

        expect(eden.children().length).toEqual(3)
        expect(eden.children()[0].children().length).toEqual(6)
      })
    })
    it('reads a CSI index', function () {
      var store = new GFF3TabixStore({
        browser: new Browser({ unitTestMode: true }),
        config: {
          urlTemplate: '../data/fake_large_chromosome/test.gff3.gz',
          csiUrlTemplate: '../data/fake_large_chromosome/test.gff3.gz.csi',
          baseUrl: '.',
        },
        refSeq: { name: '1', start: 0, end: 1248055161 },
      })

      const [rangeStart, rangeEnd] = [1000001055, 1000002500]

      var features = []
      waitsFor(function () {
        return features.done
      })
      store.getFeatures(
        { ref: '1', start: rangeStart, end: rangeEnd },
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
        expect(features.length).toEqual(12)
      })
    })
  })
})
