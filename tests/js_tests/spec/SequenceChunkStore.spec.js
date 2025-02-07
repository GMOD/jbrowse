require([
  'JBrowse/Browser',
  'JBrowse/Store/SeqFeature/SequenceChunks',
], function (Browser, ChunkStore) {
  describe('sequence chunk store', function () {
    var s
    beforeEach(function () {
      s = new ChunkStore({
        browser: new Browser({ unitTestMode: true }),
        refSeq: { name: 'ctgA', start: 1, end: 500001 },
        config: {
          baseUrl: '.',
          urlTemplate:
            '../../sample_data/json/volvox/seq/{refseq_dirpath}/{refseq}-',
          seqChunkSize: 20000,
        },
      })
    })

    it('fetches some features', function () {
      var done,
        features = []
      s.getFeatures(
        { ref: 'ctga', start: 100, end: 40000 },
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
        expect(features.length).toEqual(2)
        expect(features[0].get('residues').length).toEqual(20000)
        expect(features[1].get('residues').length).toEqual(20000)
      })
    })

    it('fetches ref seq as string 1', function () {
      var seq
      s.getReferenceSequence(
        { ref: 'ctga', start: 0, end: 5 },
        function (s) {
          seq = s
        },
        function (e) {
          console.error(e)
        },
      )
      waitsFor(function () {
        return seq
      })
      runs(function () {
        expect(seq).toEqual('cattg')
      })
    })

    it('fetches ref seq as string 2', function () {
      var seq
      s.getReferenceSequence(
        { ref: 'ctga', start: 1, end: 5 },
        function (s) {
          seq = s
        },
        function (e) {
          console.error(e)
        },
      )
      waitsFor(function () {
        return seq
      })
      runs(function () {
        expect(seq).toEqual('attg')
      })
    })

    it('fetches ref seq as string 3', function () {
      var seq
      s.getReferenceSequence(
        { ref: 'ctga', start: 49999, end: 50001 },
        function (s) {
          seq = s
        },
        function (e) {
          console.error(e)
        },
      )
      waitsFor(function () {
        return seq
      })
      runs(function () {
        expect(seq).toEqual('ac')
      })
    })

    it('fetches ref seq as string 4', function () {
      var seq
      s.getReferenceSequence(
        { ref: 'ctga', start: 100, end: 105 },
        function (s) {
          seq = s
        },
        function (e) {
          console.error(e)
        },
      )
      waitsFor(function () {
        return seq
      })
      runs(function () {
        expect(seq).toEqual('agcgg')
      })
    })

    it('fetches ref seq as string 5', function () {
      var seq
      s.getReferenceSequence(
        { ref: 'ctga', start: 19996, end: 20005 },
        function (s) {
          seq = s
        },
        function (e) {
          console.error(e)
        },
      )
      waitsFor(function () {
        return seq
      })
      runs(function () {
        expect(seq).toEqual('ttaccgcgt')
      })
    })

    it('fetches ref seq as string 6, with space padding at the beginning', function () {
      var seq
      s.getReferenceSequence(
        { ref: 'ctga', start: -3, end: 5 },
        function (s) {
          seq = s
        },
        function (e) {
          console.error(e)
        },
      )
      waitsFor(function () {
        return seq
      })
      runs(function () {
        expect(seq).toEqual('   cattg')
      })
    })

    it('fetches ref seq as string 7, with space padding at the end', function () {
      var seq
      s.getReferenceSequence(
        { ref: 'ctga', start: 49999, end: 50003 },
        function (s) {
          seq = s
        },
        function (e) {
          console.error(e)
        },
      )
      waitsFor(function () {
        return seq
      })
      runs(function () {
        expect(seq).toEqual('ac  ')
      })
    })

    it('fetches ref seq as string 8, with space padding at the beginning', function () {
      var seq
      s.getReferenceSequence(
        { ref: 'ctga', start: -5, end: 1 },
        function (s) {
          seq = s
        },
        function (e) {
          console.error(e)
        },
      )
      waitsFor(function () {
        return seq
      })
      runs(function () {
        expect(seq).toEqual('     c')
      })
    })

    it('fetches ref seq as string 9, with space padding at the beginning', function () {
      var seq
      s.getReferenceSequence(
        { ref: 'ctga', start: -28, end: 1, seqChunkSize: 20000 },
        function (s) {
          seq = s
        },
        function (e) {
          console.error(e)
        },
      )
      waitsFor(function () {
        return seq
      })
      runs(function () {
        expect(seq).toEqual('                            c')
      })
    })
  })
})
