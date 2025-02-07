/* global dojo */
require([
  'dojo/aspect',
  'dojo/_base/declare',
  'dojo/_base/array',
  'JBrowse/Browser',
  'JBrowse/FeatureFiltererMixin',
  'JBrowse/Store/SeqFeature/BAM',
  'JBrowse/Model/XHRBlob',
  'JBrowse/Store/SeqFeature/_MismatchesMixin',
  'JBrowse/View/Track/_AlignmentsMixin',
  'JBrowse/Model/SimpleFeature',
], function (
  aspect,
  declare,
  array,
  Browser,
  FeatureFiltererMixin,
  BAMStore,
  XHRBlob,
  MismatchesMixin,
  AlignmentsMixin,
  SimpleFeature,
) {
  // function distinctBins( features ) {
  //     var bins = {};
  //     features.forEach( function(f) {
  //         bins[ f.data._bin ] = ( bins[ f.data._bin ] || 0 ) + 1;
  //     });
  //     return bins;
  // }

  describe('BAM mismatches test', function () {
    var feature = new SimpleFeature({
      data: {
        start: 7903922,
        length: 90,
        cigar: '89M2741N1M',
        md: '89A0',
        seq: 'TACTTGATAAATCAGCTCACTCTCTGGTGCTTTTTAGAGAAGTCCCTGATTCCTTCTTAAACTTGGAATGATAGATGAAATTCACACCCG',
      },
    })

    //Config workaround since we aren't directly instantiating anything with Browser/config
    var Config = declare(null, {
      constructor: function () {
        this.config = {}
      },
    })
    //Use Config workaround
    var MismatchParser = declare([
      Config,
      MismatchesMixin,
      FeatureFiltererMixin,
    ])

    it('getMismatches test', function () {
      var parser = new MismatchParser()
      var obj = parser._getMismatches(feature)
      expect(obj[1].base).toEqual('G')
      expect(obj[1].length).toEqual(1)
      expect(obj[1].start).toEqual(2830)
      expect(obj[1].type).toEqual('mismatch')
    })
  })

  describe('BAM with volvox-sorted.bam', function () {
    var b
    beforeEach(function () {
      b = new BAMStore({
        browser: new Browser({ unitTestMode: true }),
        bam: new XHRBlob('../../sample_data/raw/volvox/volvox-sorted.bam'),
        bai: new XHRBlob('../../sample_data/raw/volvox/volvox-sorted.bam.bai'),
        refSeq: { name: 'ctgA', start: 1, end: 500001 },
      })
    })

    it('constructs', function () {
      expect(b).toBeTruthy()
    })

    it('loads some data', function () {
      var loaded
      var features = []
      var done
      aspect.after(b, 'loadSuccess', function () {
        loaded = true
      })
      b.getFeatures(
        { start: 0, end: 50000 },
        function (feature) {
          features.push(feature)
        },
        function () {
          done = true
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

  describe('BAM with test_deletion_2_0.snps.bwa_align.sorted.grouped.bam', function () {
    var b
    beforeEach(function () {
      b = new BAMStore({
        browser: new Browser({ unitTestMode: true }),
        bam: new XHRBlob(
          '../data/test_deletion_2_0.snps.bwa_align.sorted.grouped.bam',
        ),
        bai: new XHRBlob(
          '../data/test_deletion_2_0.snps.bwa_align.sorted.grouped.bam.bai',
        ),
        refSeq: { name: 'Chromosome', start: 1, end: 20000 },
      })
    })

    it('constructs', function () {
      expect(b).toBeTruthy()
    })

    it('loads some data', function () {
      var loaded
      var features = []
      var done
      aspect.after(b, 'loadSuccess', function () {
        loaded = true
      })
      b.getFeatures(
        { start: 17000, end: 18000 },
        function (feature) {
          features.push(feature)
        },
        function () {
          done = true
        },
      )
      waitsFor(function () {
        return done
      }, 2000)
      runs(function () {
        expect(features.length).toEqual(124)
        //console.log( distinctBins(features) );
      })
    })

    it('check that seqlength == seq.length', function () {
      var loaded
      var features = []
      var done
      aspect.after(b, 'loadSuccess', function () {
        loaded = true
      })
      b.getFeatures(
        { start: 17000, end: 18000 },
        function (feature) {
          features.push(feature)
        },
        function () {
          done = true
        },
      )
      waitsFor(function () {
        return done
      }, 2000)
      runs(function () {
        expect(
          array.every(features, function (feature) {
            return feature.get('seq_length') == feature.get('seq').length
          }),
        ).toBeTruthy()
      })
    })
  })

  describe('empty BAM', function () {
    var b
    beforeEach(function () {
      b = new BAMStore({
        browser: new Browser({ unitTestMode: true }),
        bam: new XHRBlob('../data/empty.bam'),
        bai: new XHRBlob('../data/empty.bam.bai'),
        refSeq: { name: 'Chromosome', start: 1, end: 20000 },
      })
    })

    it('constructs', function () {
      expect(b).toBeTruthy()
    })

    it("returns no data, but doesn't crash", function () {
      var loaded
      var features = []
      var done
      aspect.after(b, 'loadSuccess', function () {
        loaded = true
      })
      b.getFeatures(
        { start: 0, end: 50000 },
        function (feature) {
          features.push(feature)
        },
        function () {
          done = true
        },
      )
      waitsFor(function () {
        return done
      }, 2000)
      runs(function () {
        expect(features.length).toEqual(0)
      })
    })
  })

  describe('BAM with B tags', function () {
    var b
    beforeEach(function () {
      b = new BAMStore({
        browser: new Browser({ unitTestMode: true }),
        bam: new XHRBlob('../data/Btag.bam'),
        bai: new XHRBlob('../data/Btag.bam.bai'),
        refSeq: {
          end: 1000000,
          length: 1000000,
          name: 'chr1',
          seqChunkSize: 80000,
          start: 0,
        },
      })
    })

    it('constructs', function () {
      expect(b).toBeTruthy()
    })

    it('loads some data', function () {
      var loaded
      var features = []
      var done
      aspect.after(b, 'loadSuccess', function () {
        loaded = true
      })
      b.getFeatures(
        { start: 980654, end: 981663 },
        function (feature) {
          features.push(feature)
        },
        function () {
          done = true
        },
      )
      waitsFor(function () {
        return done
      }, 2000)
      runs(function () {
        //ZC:B:i,364,359,1,0    ZD:B:f,0.01,0.02,0.03   ZE:B:c,0,1,2,3  ZK:B:s,45,46,47
        var ret = features[1].get('ZD').split(',')
        expect(features[1].get('ZC')).toEqual('364,359,1,0')
        expect(features[1].get('ZE')).toEqual('0,1,2,3')
        expect(features[1].get('ZK')).toEqual('45,46,47')
        expect(Math.abs(+ret[0] - 0.01) < Number.EPSILON)
        expect(Math.abs(+ret[1] - 0.02) < Number.EPSILON)
        expect(Math.abs(+ret[2] - 0.03) < Number.EPSILON)
        expect(features.length).toEqual(2)
        //console.log( distinctBins(features) );
      })
    })
  })
  describe('BAM with paired end reads', function () {
    var b
    beforeEach(function () {
      b = new BAMStore({
        browser: new Browser({ unitTestMode: true, stores: [] }),
        bam: new XHRBlob('../data/paired-end-clip.bam'),
        bai: new XHRBlob('../data/paired-end-clip.bam.bai'),
        refSeq: {
          name: 'GK000001.2',
          start: 0,
          end: 12791400,
        },
      })
    })

    it('constructs', function () {
      expect(b).toBeTruthy()
    })

    it('loads some data', function () {
      var loaded
      var features = []
      var done
      aspect.after(b, 'loadSuccess', function () {
        loaded = true
      })
      b.getFeatures(
        {
          ref: 'GK000001.2',
          start: 12664001,
          end: 12791400,
          viewAsPairs: true,
        },
        function (feat) {
          /* init cache */
        },
        function () {
          b.getFeatures(
            {
              ref: 'GK000001.2',
              start: 12745199,
              end: 12749298,
              viewAsPairs: true,
            },
            function (feat) {
              features.push(feat)
            },
            function () {
              done = true
            },
          )
        },
      )
      waitsFor(function () {
        return done
      }, 2000)
      runs(function () {
        var f = features.filter(
          f => f.get('name') == 'HWI-EAS14X_10277_FC62BUY_4_119_16558_10601#0',
        )[0]
        console.log(f)
        expect(f).toBeTruthy()
        expect(f.get('start')).toEqual(12740733)
        expect(f.get('end')).toEqual(12747377)
      })
    })
  })
  describe('BAM with tests/data/final.merged.sorted.rgid.mkdup.realign.recal.bam', function () {
    var b
    beforeEach(function () {
      b = new BAMStore({
        browser: new Browser({ unitTestMode: true }),
        bam: new XHRBlob(
          '../data/final.merged.sorted.rgid.mkdup.realign.recal.bam',
        ),
        bai: new XHRBlob(
          '../data/final.merged.sorted.rgid.mkdup.realign.recal.bam.bai',
        ),
        refSeq: {
          end: 27682,
          length: 27682,
          name: 'chr21_gl000210_random',
          seqChunkSize: 80000,
          start: 0,
        },
      })
    })

    it('constructs', function () {
      expect(b).toBeTruthy()
    })

    it('loads some data', function () {
      var loaded
      var features = []
      var done
      aspect.after(b, 'loadSuccess', function () {
        loaded = true
      })
      b.getFeatures(
        { start: 16589, end: 18964 },
        function (feature) {
          features.push(feature)
        },
        function () {
          done = true
        },
      )
      waitsFor(function () {
        return done
      }, 2000)
      runs(function () {
        expect(features.length).toEqual(281)
        //console.log( distinctBins(features) );
      })
    })
  })

  describe('BAM mismatch test', function () {
    var b
    //Config workaround since we aren't directly instantiating anything with Browser/config
    var Config = declare(null, {
      constructor: function () {
        this.config = { renderAlignment: { singleline: true } }
      },
    })
    //Use Config workaround
    var MismatchParser = declare([
      Config,
      MismatchesMixin,
      FeatureFiltererMixin,
    ])
    //Use Config workaround
    var AlignmentParser = declare([
      Config,
      AlignmentsMixin,
      FeatureFiltererMixin,
    ])

    it('resultTable test', function () {
      var parser = new AlignmentParser()
      var elt = dojo.create('div')
      var res = parser._renderTable(
        elt,
        new MismatchParser(),
        new SimpleFeature({
          data: {
            id: 'read162/ctgA:g2.t1',
            seq: 'TACACAAGCACCGGGCGCGCGAGACACGATTGAATCCTTCAAACAGGGTTACTCGTTCGTGACAACCGATTACAGCATTCTTAACGTGGTACGTGCACAT',
            md: '77G18',
            cigar: '4S22M50N74M',
          },
        }),
      )
      expect(res.val1).toEqual(
        'TACACAAGCACCGGGCGCGCGAGACA..................................................CGATTGAATCCTTCAAACAGGGTTACTCGTTCGTGACAACCGATTACAGCATTCTTAACGTGGTACGTGCACAT',
      )
      expect(res.val2).toEqual(
        '    ||||||||||||||||||||||                                                  ||||||||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||',
      )
      expect(res.val3).toEqual(
        '....CAAGCACCGGGCGCGCGAGACANNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNCGATTGAATCCTTCAAACAGGGTTACTCGTTCGTGACAACCGATTACAGCATTCTGAACGTGGTACGTGCACAT',
      )
    })
    it('resultTable test insertion', function () {
      var parser = new AlignmentParser()
      var elt = dojo.create('div')
      var res = parser._renderTable(
        elt,
        new MismatchParser(),
        new SimpleFeature({
          data: {
            id: 'ctgA_15155_15557_3:0:1_0:0:0_1dde',
            seq: 'TTTAGTGGGACCCAATCGCAACCCTGCTCCCCTCCCTTACGCCTTATACACTTCAGTGTAAATTCATGCGTTCAGCGAACAACTGGACTTCTGTTGTACG',
            md: '11A45C41',
            cigar: '9M1I90M',
          },
        }),
      )
      expect(res.val1).toEqual(
        'TTTAGTGGGACCCAATCGCAACCCTGCTCCCCTCCCTTACGCCTTATACACTTCAGTGTAAATTCATGCGTTCAGCGAACAACTGGACTTCTGTTGTACG',
      )
      expect(res.val2).toEqual(
        '||||||||| || ||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||',
      )
      expect(res.val3).toEqual(
        'TTTAGTGGG-CCAAATCGCAACCCTGCTCCCCTCCCTTACGCCTTATACACTTCAGTGCAAATTCATGCGTTCAGCGAACAACTGGACTTCTGTTGTACG',
      )
    })

    it('resultTable test large deletion', function () {
      var parser = new AlignmentParser()
      var elt = dojo.create('div')
      var res = parser._renderTable(
        elt,
        new MismatchParser(),
        new SimpleFeature({
          data: {
            seq: 'TGATGAGGTCCCTACAAAATCCTATGCTCCCTGCGAATTACAACTCACAGTAAGAAGGGTCACTCTACCAGCGGGGTTAAATATACCGGCCGACTGTCTC',
            md: '50^agaacagcctaggctttcttagttattgatgcacattctactgacgaacgcagcattcgaactaaaccattggtaatgtaattgtgacacgtgggaatctatttaaagctgcaagaactccaccacgtgttcatccacatcggtctctgtggaatggtccaggaccgtcccaatagggggaattgcgagacccaactaatcgagtgattgaacatgggagcaattcccgaatagaaacttgcaacgcgcagtactacgacgatggtagcaataacgacgcgctacttcagctcatgggtctaaattagggcgaacgattgcacctaatctgctggcttctctagattgtagatccacagggccaattaacagtgcaaagaatagcgtcatatgattagtttgaaaataatatacatgaaaatcgagcacccgcatcaataagctacgagagtctttggagagtgccaatacacctagcacatgctgtgcttatgttatgaaaattcatacttgactaacgttagccaccagccgatggcgctgtcacaacgaccctgggttaccgtttagttctc50',
            cigar: '50M575D50M',
          },
        }),
      )
      expect(res.val1).toEqual(
        'TGATGAGGTCCCTACAAAATCCTATGCTCCCTGCGAATTACAACTCACAG-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------TAAGAAGGGTCACTCTACCAGCGGGGTTAAATATACCGGCCGACTGTCTC',
      )
      expect(res.val2).toEqual(
        '||||||||||||||||||||||||||||||||||||||||||||||||||                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               ||||||||||||||||||||||||||||||||||||||||||||||||||',
      )
      expect(res.val3).toEqual(
        'TGATGAGGTCCCTACAAAATCCTATGCTCCCTGCGAATTACAACTCACAGagaacagcctaggctttcttagttattgatgcacattctactgacgaacgcagcattcgaactaaaccattggtaatgtaattgtgacacgtgggaatctatttaaagctgcaagaactccaccacgtgttcatccacatcggtctctgtggaatggtccaggaccgtcccaatagggggaattgcgagacccaactaatcgagtgattgaacatgggagcaattcccgaatagaaacttgcaacgcgcagtactacgacgatggtagcaataacgacgcgctacttcagctcatgggtctaaattagggcgaacgattgcacctaatctgctggcttctctagattgtagatccacagggccaattaacagtgcaaagaatagcgtcatatgattagtttgaaaataatatacatgaaaatcgagcacccgcatcaataagctacgagagtctttggagagtgccaatacacctagcacatgctgtgcttatgttatgaaaattcatacttgactaacgttagccaccagccgatggcgctgtcacaacgaccctgggttaccgtttagttctcTAAGAAGGGTCACTCTACCAGCGGGGTTAAATATACCGGCCGACTGTCTC',
      )
    })

    it('resultTable long read', function () {
      var parser = new AlignmentParser()
      var elt = dojo.create('div')
      var res = parser._renderTable(
        elt,
        new MismatchParser(),
        new SimpleFeature({
          data: {
            seq: 'TAAGGGCAAGTGGCCGCAACAACTGCGATTACTGACCAACTTGAGTGAGAACTAAGCCTTGAAGCATAGTAGTTGCAATGTTGTAGAAAAGTATACATGTGACAAAAGACAGGGCCTGGTGTCAAGTGTCCTCAGTGATCTGGATAATCATCACGCCTTGTTAGCAGGATTTACCCGCATAGTAATGGCCGGACTTTATATTGCCCTGCTGCGCTAGCTAGTACTGCGGAGGCTCTCTCCCCCTAATTGATATCCGGGCAAGAATGCGCGGGTAGTCAGCATTCATGTCAGTGCTTCTATCAACGTCCTCATTCACCTTGGAAGTGTTGACCTACAGTGTTAAGAGGCAATGTAGCCCGAGACGCCCGTTCAAAGACAAAGCTCCCTGTAATTAAACAGACACCGGTTATGGAGAGTGTGAGTAAGTGACTTCCGACCAGTGTTTGGTATTACAGCCTGGTCCGGTTAACCTCGCAGGGCTAGGAGAATGAGCGCTAGATAGGTGATTACCGAAGTCTCCCCAAAAGGGAACAGTCTTATTAGAGTAGAGAATGTCAAATAGCGTTTATTGAGTTCTGTCTACTGCCCTACCAAGAGCATGCACCAGAGATGCGTCGCAGTCGTAGCGGTAGACGTCGTAATGACCCAGGTGGCGTTCGCGACCTATTCGCGTCGGACGCGCGCGCTACTACAACGAAGGGGTCTGAAAGTGCATGTTCACACTGAAATTCTAGTGTTAGTAAACAAACGCGTGTATTCCAGGGTCGTGTGTGACATTATATGGCTGTCTGCGCCCCTCAATGATCATCCAAGACGTTCAATTGTATCGTTAACGTAGATATCAGGTTTACGTTATCCGTATACTTATTTACGCCGCGCGCTTGAACAGATTCTCCTAACAGCCCTCGCGGTTTCAAAAAGAATCCAAAGTCTACGTACCATCCTTGTTCCAATTCTGCCTGGTTGCGGAGAAAAGATCCGCCTCCGATTACGTACCCGACTCGGTATTGGTAAGTGGGGAAGCAGTCGAACGCATATTTCTTGTTGGTTATATCACAGGCCACGTTTATATCCGGAAGTGGCCGGGATTACGATTTGACGTTCTATCCCCGAGAGCGCATTCTTGTTTGTTACGTACTACCACGCGGGCGCTTCTTATTCCCAGACCAGAGGGAATGTGCGGAAGCTTCTTTCCACAGATTGGCGGAACTTCCGCGTGCTTAGTGCAGGCGGAGAACGTCCGTTCAGTGGTGCGGCTTTATTTTCAATCTGACCCGACCTGCGCTCAAGAGTTGACTAAGTTGTTGTGCGCCCCGAGTAATAGGCGACTCGTCGCAATGGGTCTGGTACATTTAGCATTTTCATCGGTACTGGCGCTTCATAAAGTGCGGCAAATTTCTCACCCCAGTACTCATGTTTATTAGGGTATCAGGACCCGAAGCTTCTCTGTTCCAAAGAAATGTACTGTTTGCTCCCCTGTCCATCATTTGGAGGAGATCACTTGTGGATTCATGCAATGATGAATGATAAGTTTGGTGCTCCCCACCCGGGGCGCTCTCCAAAAGAGTGAGCAATTTGAACATTTAAATTGCTATTCCAACCCGGAGTCCTGACCGGAACAGTAATGAAACTTCAACCATGCCGTGACAGACTAGAAGAAGGGAAAGTGCTTGTATATGGGAGTAAAATGATGTTGGTGCCGTAATGGTGCCGGGAAGTACTATAGACGCATGTCGTGACGCACCGAGGTAGGCAGTGCTATAATCGTACTGATCCTTCAGGCGCCGCCGGACCTACGAAGCTGAGATTAGACACCGGCACACTAGCCCCGTCAGCGACGGCTGCGCGGCCGTAGCCCTGCAGCGGAATGGGGCTAACACGCATAAACGCCCGCATAACCACTCGAGTCTACGGGAGATTCACTCAGGCTGTTTGCTTCGAACGTGTAGTCTCATTACATAATTCATAATACCTCCAAGACCAACGGCTGCTCATGACTCTCTTACCTTGTTAGAGGACATTTCGGCACTAGGGAAGAGTACTGAGGACTTTGAAAACGTCGATAAAACCATCGCGGGAACTAGACTAGCGTTAGACACTCCATATTTTACGGGTCGCAAGCTTGAGGTCACTGTCCCGGCCAGCTGCAAGTGCTACGGCAGGAGGGGATCTACCTAACGTGCAGTAAACGAGCCCTTGCCCAGTAATGAGGCGTACTCCGTCTCTAATCGTCAGTAAGTTACATGTCCGAGGACGCCCTCTACGAGTTGAACTCTGGCTACGGCACCACCTGTCGCGCGCCCTGCTCGGGTCCCCATCTTGCTTATCCAAACTCACCTCGCCTTACGGAATCTCTGGTTGCCAGTCATCCGATGGTCATTGAAGCAGCCGTGGTACATCGTAGCCAGATACTTCCAGGGCGGCCAGCCATATTCCTACAGCCAAGTCGGCTGCATAATTACAGCGCCTGGCACGGACTAATACGATCCCACAAGCCTGGTAGATGACCCTTAGACACCTAAAGCGCCCTCTGACCTATCTGCACGTGATACTTGATTTTTTGTCAATGAGCGGACAGGTAGATGACTAATATCACAGGTGTCGTCTAGGTTTGCACAATGTCAGCACGACTCATCCCGCAAGGCCCGGACGGCTGACTCACATCAGCTAGCTCCATCTCCCTCAGCAGCACTAAGATTCCCACGTGACCAGGGCGACGGGCCTCAGCCAAACGTATCCTTGATATCTACTTAAGTCAAGGTTGACTCCGAACCCTATGGGTCGGTAGCCGTTAACAGGGAGTCTATATCTCGGCGTTCCATTGCTTGTTTCAAACTACTGCTATAAGGTGAAAGCGCTGGAGGGCATAGTATTATGCCCAAAGTTGCGCGTAGATCCGTCGGGATATGTTGCTATAATAAGGACTGCTTCGAGAGTAGGCGGTAACGGCCTCCCGCCTTCAGTGGCGCGGAACATCGAATCGGAGTTACAAGCGACTTGACCGATGTCATGATCCAAGTTTATGTTACCCGATCGGATCCGGATGCTCGATCGTGCGACGAGGTCGGAAAGACGGACGAAATACGATTCAACCGCGCGCAACTCATTAGCATCTAACCTTTAGCCTCACATGGGTGTTAACGTGGTGGGCTCACTCGGCGTACTCTTTGTGCACTATTCGCGTATAGAACAACAGCTCAAGTTGCGACATGATGCTCTTACGTGATTCCCACAGTTTCCCACCTCAGGATGCTTTCTTTAGCTAAAAGCCCAATAGTTATGGGCGGCACCTTCCAGACTCCCACGAGGACGGCTATGACGTTGCTAAACCATCGCCGCCAAAGGCTAGCGCTAACGAGTTCTGTGAGTTTGTTCCGGGCCAGATCTCCAGAGATGGTCGCAACAACGCAGTACCGGTCTTTATACTGGTGACCCTCTACCTGTATTAAGTTAAGCGTTGTCCTACGTACATGGTCGTGAGTACCTCGCGTAGCTCAAACGCCAACGGCACTAGCAGCGAGAATTATTGTCGCGATACTTACTACAATACTTTACCCGATATTGACGTGCAGGGTTGAAAGACGATGGGACAGTTGAATATCCTATTTTGACGGAATCCTCAAAACTCCCTCCACCTCAGGTACGGCCCTGTCCGGGACCGCATTCTTGCATATATTGGGTCCCAGAGCGTATCTAAGTTAGTTCTCTTGACCGTTCACCGACTCATAGGGCGACTCGTTATCGCCCTCCGAAACCGATAGCTTCGTTACCTCAGAATGATGACAGAGCCTGTAACGTAGAGTGATCCCAATCTCACTCGTGCCTTGTCCACCGTTCCGTGAAGACGAAGCAATACGCGGAATACGTGGCTTCGTAATATTTTGACGATATGGGGGCTGGGACGCGTCAAGACTTCCATGACAAACAAAGTGAAGAGCAACTGCATACCCTCATCATGAGTCACTATTACCAGAGGTAGCGATGGAAACGCTAATTTGGGTCAGGGCAGCTATCGCAGTCCCGCAGGTGTAGGCGCGAAGACTTTTTCTTTTGTTGCGGAGTTGATCAAGGTAATCTCACGGTATAAGCACGGTTATTTACGCCAAGCGACGTCCCTGGGAGATCCGCCCACGTAGGGACCCCATAATCCATAAATGACCTGCGTCGAAACCTTCATATCGTGACAGAACCGCTTTCCTAGGGATGACGGTCCCCGCATTCAGAGTTCTGACTTTGGCCAGCGTGTAGACTTAACAACTCCACTTACGCGGTACATTGAAGTCCCGTTCAGTCCAGTGTGACCTGTGTACTCGAATAACGTGTAGACCAGCGCGTCTACGACTTAGCGCGGCTCCACTCCAAGAGCACCTTTTGGAACTTTCGCAACGAGCGCTGTTGGCCGTTAAGCGGTATTTCACAAATAGATCACCCTAGTGTCGGTAAACCGACTACCCTATTGGGATCATCGTGAGCTCGAAACACTAGAGGCGGACCAACGGATATGACATTGATTCGGCTCTACAGAGCTTTCGCCCAGAGGAAAAACTGTGGCAATCTACGCTCGCGGGGGAATTGACTTTAGCGGCCCCTTAGACAGGTGTGGGACACTAGTCTAGATTCACGTCCTACACGACATAACAGCACTTCCTGGCCAGCCCAGAAATAGTACCTGGACGACATCCAGCCTTCCGACGCCATAATGTGGAGCCGTAGCGCCCACGACGATCAACGAGGAGAAATTTACAAAAGGCTGTGTGAATGCTACGTCGTCTACCATTGCCTCATCGAAACGAACGCAACGCACAGCATACAACGTTTTACCATGCCGGAGCGGGATTCCTCAAGTACAGAAGAACAGAGGTCTAAACATGATCCTGAACAAATCGGTGGTTTACACAGCTACCTCAGTCGCATTGGCGTACTGCATCGATCGTGCTTAATCTACGGTCATGCCGGCCCGCGATGCACGTACGAATGGAATACCCTGTCTGCCCCCGCGCGAGTTACGCTGTCTCGCACATACCGAGCACTTGTCGTTCGAAGCTAAACTATGAGCCCACCGAGCTCCTTATGGCCGCAACCGCGGTGCGGCCAGCTGATAAATTTCCACAGAACACGATCCTCGTGTAAGATCTCGCGGCATAGTAAGTCATTTTCACATGGTTAGGAGAGATAGAATACATGGTTCTGGTAGCTCAACCAGGCATTTGTGGAACCACTTGGCCCTTGGTGAGTGCTAACAATAAAATTCTCCGTATGGGACCAACCAAAGGGTGCTGGATGTGACTTCCCGGCCCAGGTTAGATGTCCATATCATTCATATCATTGCCCGACCGACCCAATGCCTACAATCGATGATGGCGCCTTAGCTAGTTCTTGAGTGTGCCACGTGCCGGCCACGCAGACACGACCCTGCGGCGAGTGATCACCATTACCGGGATTGGCATCGAAGTCTTTTTCTGGGAAGTTAGCCAGTTGAGTGTGCGGTGGCTTAGAATCTCTATTCCCACGTCAAACGCCCCTGGGACGATATTGCTTAACCCTAGTTGGCCACCACCGGAACCATCTTACGGGAGAGCTAGAGCACAGATCCGAGGTTAGATATGTTAGCGTCTCTCGTGAGTCTGAAATGTATCACTTCACCGCGAGAATAGCGCGAATGTCTGTTTGCCCTGGACCATGACGGATTGGCTTAAAAGCACGCTAGTAGCATTTTGGTACGGTTTCCGATCCCGCGATCGTAATTACCTATCTAGGTTATCGCTAG',
            md: '24^a196^g7^t15^t60^c163^t24^c4^g61a14^c1^c97^t29^a145^g64^c111^c142^a41^t10^t26^g171^g22^t25^a40^g9^ta95^t16^a34^g81a45^c31^a297^c44^t65^a19^t98^c114^a18^g53^g19^t179c121^a81^t118^a152^t110^t9^c180^a38^t79^t212^t35^c92^a38^g191^a12g127^t21^g111^c237^a165^g24^t27^t255^t95^t70g120^a15^a23t36',
            cigar:
              '7=1I9=1I8=1D10=2I32=1I4=1I20=1I10=1I37=1I83=1I1D7=1D8=1I7=1D7=1I30=1I14=1I9=1D6=1I3=1I8=1I6=1I19=1I17=1I5=1I1=1I23=1I10=1I24=1I2=1I6=1I2=1I31=1D5=1I19=1D3=1I1=1D17=1I25=1I19=1X14=1D1=1D26=1I30=1I1=1I36=1I4=1D29=1D45=2I30=1I17=1I22=1I15=1I16=1D40=1I10=2I14=1D27=1I8=1I1=1I53=3I22=1D6=1I12=1I47=1I54=1I20=1I3=1D41=1D10=1D25=1I1=1D3=1I1=1I14=1I40=2I16=1I26=1X21=1I49=1D14=1I1=1I7=1D16=1I9=1D7=1I18=1I12=1I3=1D9=2D72=1I23=1D16=1D30=1I4=1D8=1I18=1I1=1I20=1I2=1I32=1X35=1I10=1D1=1I10=1I20=1D22=1I8=1I15=1I8=1I20=1I51=1I24=2I43=1I2=1I8=1I33=1I10=1I44=1I9=1D1I5=1I15=1I24=1D15=1I22=1I3=1I9=1I16=1D7=1I11=1I1=1D48=1I7=1I17=1I1=1X4=1I7=1I13=1D1I1=2I6=1I28=1I6=1I31=1I1=1I41=1D2=1I3=1I13=1D15=1I5=1I21=1I3=1I2=1I1=1I6=1D19=1D7=1I122=1I50=1X33=1I37=1I18=1I5=1I14=1I14=1D10=1I15=1I2=1I11=1I5=1I38=1D3=1I14=1I30=1I3=1I25=1I43=1D7=1I5=1I9=1I67=1I3=1I14=1I9=1I38=1D59=1I26=1I25=1D9=1D31=1I8=1I10=2I2=1I41=1I31=1I5=1I13=1I39=1D36=1I2=1D21=1I22=1I28=1I4=1I4=1D10=1I1=1I9=1I1=1I10=1I95=1I9=1I40=1I12=1I15=1I10=1D12=1I18=1I5=1I1D11=1I1=1I19=1I7=1I2=1I33=1I19=1D15=1I18=1I2=1I3=1D34=1I8=1I22=1I15=1I36=1I1=1I25=1I50=1I1D1I12=1X6=1I8=1I51=1I56=2I6=1D21=1D4=1I5=1I29=1I20=1I53=1D59=1I42=1I33=1I36=1I19=1I14=1I22=1I12=1D18=1I3=1I28=2I34=1I55=1I27=1D22=1I2=1D21=1I6=1D1=1I23=1I14=1I51=1I12=1I21=1I23=1I58=1I25=1I4=1I1=1I2=1I20=1D12=1I22=1I21=1I40=1D1=1I10=1I10=1I8=1I20=1I5=1I11=1I5=1I1X13=1I8=1I4=1I2=1I1=1I6=1I19=1I30=1I6=1I24=2I7=1D13=1I2=1D4=1I16=1I3=1X4=1I5=1I27=',
          },
        }),
      )
      expect(res.val1).toEqual(
        'TAAGGGCAAGTGGCCGCAACAACTGC-GATTACTGACCAACTTGAGTGAGAACTAAGCCTTGAAGCATAGTAGTTGCAATGTTGTAGAAAAGTATACATGTGACAAAAGACAGGGCCTGGTGTCAAGTGTCCTCAGTGATCTGGATAATCATCACGCCTTGTTAGCAGGATTTACCCGCATAGTAATGGCCGGACTTTATATTGCCCTGCTGCGCTAGCTAGTACTGCGGA-GGCTCTC-TCCCCCTAATTGATAT-CCGGGCAAGAATGCGCGGGTAGTCAGCATTCATGTCAGTGCTTCTATCAACGTCCTCATTCAC-CTTGGAAGTGTTGACCTACAGTGTTAAGAGGCAATGTAGCCCGAGACGCCCGTTCAAAGACAAAGCTCCCTGTAATTAAACAGACACCGGTTATGGAGAGTGTGAGTAAGTGACTTCCGACCAGTGTTTGGTATTACAGCCTGGTCCGGTTAACCTCGCAGGGCTAGGAGAATGAGC-GCTAGATAGGTGATTACCGAAGTCT-CCCCA-AAAGGGAACAGTCTTATTAGAGTAGAGAATGTCAAATAGCGTTTATTGAGTTCTGTCTACTGCCCTACCAAGAGCATG-C-ACCAGAGATGCGTCGCAGTCGTAGCGGTAGACGTCGTAATGACCCAGGTGGCGTTCGCGACCTATTCGCGTCGGACGCGCGCGCTACTACAACGAAGGGGT-CTGAAAGTGCATGTTCACACTGAAATTCT-AGTGTTAGTAAACAAACGCGTGTATTCCAGGGTCGTGTGTGACATTATATGGCTGTCTGCGCCCCTCAATGATCATCCAAGACGTTCAATTGTATCGTTAACGTAGATATCAGGTTTACGTTATCCGTATACTTATTTACGCCGCGCGCTT-GAACAGATTCTCCTAACAGCCCTCGCGGTTTCAAAAAGAATCCAAAGTCTACGTACCATCCTTGTTC-CAATTCTGCCTGGTTGCGGAGAAAAGATCCGCCTCCGATTACGTACCCGACTCGGTATTGGTAAGTGGGGAAGCAGTCGAACGCATATTTCTTGTTGGTTATATCACAGGCCACGTT-TATATCCGGAAGTGGCCGGGATTACGATTTGACGTTCTATCCCCGAGAGCGCATTCTTGTTTGTTACGTACTACCACGCGGGCGCTTCTTATTCCCAGACCAGAGGGAATGTGCGGAAGCTTCTTTCCACAGATTGGCGGAACTTCC-GCGTGCTTAGTGCAGGCGGAGAACGTCCGTTCAGTGGTGCG-GCTTTATTTT-CAATCTGACCCGACCTGCGCTCAAGAG-TTGACTAAGTTGTTGTGCGCCCCGAGTAATAGGCGACTCGTCGCAATGGGTCTGGTACATTTAGCATTTTCATCGGTACTGGCGCTTCATAAAGTGCGGCAAATTTCTCACCCCAGTACTCATGTTTATTAGGGTATCAGGACCCGAAGCTTCTCTGTTCCAAAGAAATGTACTGTTT-GCTCCCCTGTCCATCATTTGGAGG-AGATCACTTGTGGATTCATGCAATGA-TGAATGATAAGTTTGGTGCTCCCCACCCGGGGCGCTCTCCAAA-AGAGTGAGC--AATTTGAACATTTAAATTGCTATTCCAACCCGGAGTCCTGACCGGAACAGTAATGAAACTTCAACCATGCCGTGACAGACTAGAAGAAGGGAAAGT-GCTTGTATATGGGAGT-AAAATGATGTTGGTGCCGTAATGGTGCCGGGAAGT-ACTATAGACGCATGTCGTGACGCACCGAGGTAGGCAGTGCTATAATCGTACTGATCCTTCAGGCGCCGCCGGACCTACGAAGCTGAGATTAGACACCGGCACACTAGCCCCGTCAGCGACGGCTGCGCGGCCG-TAGCCCTGCAGCGGAATGGGGCTAACACGCATA-AACGCCCGCATAACCACTCGAGTCTACGGGAGATTCACTCAGGCTGTTTGCTTCGAACGTGTAGTCTCATTACATAATTCATAATACCTCCAAGACCAACGGCTGCTCATGACTCTCTTACCTTGTTAGAGGACATTTCGGCACTAGGGAAGAGTACTGAGGACTTTGAAAACGTCGATAAAACCATCGCGGGAACTAGACTAGCGTTAGACACTCCATATTTTACGGGTCGCAAGCTTGAGGTCACTGTCCCGGCCAGCTGCAAGTGCTACGGCAGGAGGGGATCTACCTAACGTGCAGTAAACGAGCCC-TTGCCCAGTAATGAGGCGTACTCCGTCTCTAATCGTCAGTAAGTTAC-ATGTCCGAGGACGCCCTCTACGAGTTGAACTCTGGCTACGGCACCACCTGTCGCGCGCCCTGCTCGGGT-CCCCATCTTGCTTATCCAAAC-TCACCTCGCCTTACGGAATCTCTGGTTGCCAGTCATCCGATGGTCATTGAAGCAGCCGTGGTACATCGTAGCCAGATACTTCCAGGGCGGCCAGCCATATTCC-TACAGCCAAGTCGGCTGCATAATTACAGCGCCTGGCACGGACTAATACGATCCCACAAGCCTGGTAGATGACCCTTAGACACCTAAAGCGCCCTCTGACCTATCTGCACGTGATACTTGATT-TTTTGTCAATGAGCGGACAG-GTAGATGACTAATATCACAGGTGTCGTCTAGGTTTGCACAATGTCAGCACGACTCATCC-CGCAAGGCCCGGACGGCTG-ACTCACATCAGCTAGCTCCATCTCCCTCAGCAGCACTAAGATTCCCACGTGACCAGGGCGACGGGCCTCAGCCAAACGTATCCTTGATATCTACTTAAGTCAAGGTTGACTCCGAACCCTATGGGTCGGTAGCCGTTAACAGGGAGTCTATATCTCGGCGTTCCATTGCTTGTTTCAAACTACTGCTATAAGGTGAAAGCGCTGGAGGGCATAGTATTATGCCCAAAGTTGCGCGTAGATCCGTCGGGATATGTTGCTATAATAAGGACTGCTTCGAGAGTAGGCGGTAACGGCCTCCCGCCTTCAGT-GGCGCGGAACATCGAATCGGAGTTACAAGCGACTTGACCGATGTCATGATCCAAGTTTATGTTACCCGATCGGATCCGGATGCTCG-ATCGTGCGACGAGGTCGGAAAGACGGACGAAATACGATTCAACCGCGCGCAACTCATTAGCATCTAACCTTTAGCCTCACATGGGTGTTAACGTGGTGGGCTCACTCGGCGTACTCTTTGTGC-ACTATTCGCGTATAGAACAACAGCTCAAGTTGCGACATGATGCTCTTACGTGATTCCCACAGTTTCCCACCTCAGGATGCTTTCTTTAGCTAAAAGCCCAATAGTTATGGGCGGCACCTTCCAGACTCCCACGAGGACGGCTATGACGTTGCTAAACCA-TCGCCGCCAAAGGCTAGCGCTAACGAGTTCTGTGAGTTTGTTCCGGGCCAGATCTCCAGAGATGGTCGCAACAACGCAGTACCGGTCTTTATACTGGTGACCCTCTACCTGT-ATTAAGTTA-AGCGTTGTCCTACGTACATGGTCGTGAGTACCTCGCGTAGCTCAAACGCCAACGGCACTAGCAGCGAGAATTATTGTCGCGATACTTACTACAATACTTTACCCGATATTGACGTGCAGGGTTGAAAGACGATGGGACAGTTGAATATCCTATTTTGACGGAATCCTCAAAACTCCCTCCACCTCAGGT-ACGGCCCTGTCCGGGACCGCATTCTTGCATATATTGGGT-CCCAGAGCGTATCTAAGTTAGTTCTCTTGACCGTTCACCGACTCATAGGGCGACTCGTTATCGCCCTCCGAAACCGATAGCTT-CGTTACCTCAGAATGATGACAGAGCCTGTAACGTAGAGTGATCCCAATCTCACTCGTGCCTTGTCCACCGTTCCGTGAAGACGAAGCAATACGCGGAATACGTGGCTTCGTAATATTTTGACGATATGGGGGCTGGGACGCGTCAAGACTTCCATGACAAACAAAGTGAAGAGCAACTGCATACCCTCATCATGAGTCACTATTACCAGAGGTAGCGATGGA-AACGCTAATTTGGGTCAGGGCAGCTATCGCAGTCCCGC-AGGTGTAGGCGCGAAGACTTTTTCTTTTGTTGCGGAGTTGATCAAGGTAATCTCACGGTATAAGCACGGTTATTTACGCCAAGCGACGTCCCTGGGAG-ATCCGCCCACGTAGGGACCCCATAATCCATAAATGACCTGC-GTCGAAACCTTCATATCGTGACAGAACCGCTTTCCTAGGGATGACGGTCCCCGCATTCAGAGTTCTGACTTTGGCCAGCGTGTAGACTTAACAACTCCACTTACGCGGTACATTGAAGTCCCGTTCAGTCCAGTGTGACCTGTGTACTCGAATAACGTGTAGACCAGCGCGTCTACGACTTAGCGCGGCTCCACTCCAA-GAGCACCTTTTGGAACTTTCGCAACGAGCGCTGTTGGCCGTTAAGCGGTATTTCACAAATAGATCACCCTAGTGTCGGTAAACCGACTACCCTATTGGGATCATCGTGAGCTCGAAACACTAGAGGCGGACCAACGGATATGACAT-TGATTCGGCTCTACAGAGCTT-TCGCCCAGAGGAAAAACTGTGGCAATCTACGCTCGCGGGGGAATTGACTTTAGCGGCCCCTTAGACAGGTGTGGGACACTAGTCTAGATTCACGTCCTACACGACATAACAGCAC-TTCCTGGCCAGCCCAGAAATAGTACCTGGACGACATCCAGCCTTCCGACGCCATAATGTGGAGCCGTAGCGCCCACGACGATCAACGAGGAGAAATTTACAAAAGGCTGTGTGAATGCTACGTCGTCTACCATTGCCTCATCGAAACGAACGCAACGCACAGCATACAACGTTTTACCATGCCGGAGCGGGATTCCTCAAGTACAGAAGAACAGAGGTCTAAACATGATCCTGAACAAATCGGT-GGTTTACACAGCTACCTCAGTCGCATTGGCGTACTGCATCGATCGTGCTTAATCTACGGTCATGCCGGCCCGCGATGCACGTACGAATGGAATACCCTGTCTGCCCCCGCGCGAGTTACGCTGTCTCGCACATACCGAGCACTTGTCGTTCGAAGCTAAACTATGAGCCCA-CCGAGCTCCTTATGGCCGCAACCGC-GGTGCGGCCAGCTGATAAATTTCCACAG-AACACGATCCTCGTGTAAGATCTCGCGGCATAGTAAGTCATTTTCACATGGTTAGGAGAGATAGAATACATGGTTCTGGTAGCTCAACCAGGCATTTGTGGAACCACTTGGCCCTTGGTGAGTGCTAACAATAAAATTCTCCGTATGGGACCAACCAAAGGGTGCTGGATGTGACTTCCCGGCCCAGGTTAGATGTCCATATCATTCATATCATTGCCCGACCGACCCAATGCCTACAATCGATGATGGCGCCTTAGCTAGTTCTTG-AGTGTGCCACGTGCCGGCCACGCAGACACGACCCTGCGGCGAGTGATCACCATTACCGGGATTGGCATCGAAGTCTTTTTCTGGGAAGTTAGCCAGTT-GAGTGTGCGGTGGCTTAGAATCTCTATTCCCACGTCAAACGCCCCTGGGACGATATTGCTTAACCCTAGTTGGCCACCACCGGAACCATCTTACGGGAGAGCTAGAGCACAGATCCGAGGTTAGATATGTTAGCGTCTCTCGTGAGTCTGAAATGTATCACTTCACCGCGAGAATAGCGCGAATGTCTGTTTGCCCTGGACCATGACGGA-TTGGCTTAAAAGCACG-CTAGTAGCATTTTGGTACGGTTTCCGATCCCGCGATCGTAATTACCTATCTAGGTTATCGCTAG',
      )
      expect(res.val2).toEqual(
        '||||||| ||||||||| |||||||| ||||||||||  |||||||||||||||||||||||||||||||| |||| |||||||||||||||||||| |||||||||| ||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||  ||||||| |||||||| ||||||| ||||||| |||||||||||||||||||||||||||||| |||||||||||||| ||||||||| |||||| ||| |||||||| |||||| ||||||||||||||||||| ||||||||||||||||| ||||| | ||||||||||||||||||||||| |||||||||| |||||||||||||||||||||||| || |||||| || ||||||||||||||||||||||||||||||| ||||| ||||||||||||||||||| ||| | ||||||||||||||||| ||||||||||||||||||||||||| ||||||||||||||||||| |||||||||||||| | |||||||||||||||||||||||||| |||||||||||||||||||||||||||||| | |||||||||||||||||||||||||||||||||||| |||| ||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||  |||||||||||||||||||||||||||||| ||||||||||||||||| |||||||||||||||||||||| ||||||||||||||| |||||||||||||||| |||||||||||||||||||||||||||||||||||||||| ||||||||||  |||||||||||||| ||||||||||||||||||||||||||| |||||||| | |||||||||||||||||||||||||||||||||||||||||||||||||||||   |||||||||||||||||||||| |||||| |||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||| ||| ||||||||||||||||||||||||||||||||||||||||| |||||||||| ||||||||||||||||||||||||| | ||| | |||||||||||||| ||||||||||||||||||||||||||||||||||||||||  |||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||| | ||||||| |||||||||||||||| ||||||||| ||||||| |||||||||||||||||| |||||||||||| ||| |||||||||  |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||| |||||||||||||||| |||||||||||||||||||||||||||||| |||| |||||||| |||||||||||||||||| | |||||||||||||||||||| || |||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||| |||||||||| | |||||||||| |||||||||||||||||||| |||||||||||||||||||||| |||||||| ||||||||||||||| |||||||| |||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||  ||||||||||||||||||||||||||||||||||||||||||| || |||||||| ||||||||||||||||||||||||||||||||| |||||||||| |||||||||||||||||||||||||||||||||||||||||||| |||||||||  ||||| ||||||||||||||| |||||||||||||||||||||||| ||||||||||||||| |||||||||||||||||||||| ||| ||||||||| |||||||||||||||| ||||||| ||||||||||| | |||||||||||||||||||||||||||||||||||||||||||||||| ||||||| ||||||||||||||||| |||||| ||||||| |||||||||||||  |  |||||| |||||||||||||||||||||||||||| |||||| ||||||||||||||||||||||||||||||| | ||||||||||||||||||||||||||||||||||||||||| || ||| ||||||||||||| ||||||||||||||| ||||| ||||||||||||||||||||| ||| || | |||||| ||||||||||||||||||| ||||||| |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||||| |||||||||||||||||| ||||| |||||||||||||| |||||||||||||| |||||||||| ||||||||||||||| || ||||||||||| ||||| |||||||||||||||||||||||||||||||||||||| ||| |||||||||||||| |||||||||||||||||||||||||||||| ||| ||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||| ||||||| ||||| ||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| ||| |||||||||||||| ||||||||| |||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||| ||||||||||||||||||||||||| ||||||||| ||||||||||||||||||||||||||||||| |||||||| ||||||||||  || ||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||| ||||| ||||||||||||| ||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||| || ||||||||||||||||||||| |||||||||||||||||||||| |||||||||||||||||||||||||||| |||| |||| |||||||||| | ||||||||| | |||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||| |||||||||||||||||||||||||||||||||||||||| |||||||||||| ||||||||||||||| |||||||||| |||||||||||| |||||||||||||||||| |||||  ||||||||||| | ||||||||||||||||||| ||||||| || ||||||||||||||||||||||||||||||||| ||||||||||||||||||| ||||||||||||||| |||||||||||||||||| || ||| |||||||||||||||||||||||||||||||||| |||||||| |||||||||||||||||||||| ||||||||||||||| |||||||||||||||||||||||||||||||||||| | ||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||   |||||||||||| |||||| |||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||||||||  |||||| ||||||||||||||||||||| |||| ||||| ||||||||||||||||||||||||||||| |||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||| ||||||||||||||||||| |||||||||||||| |||||||||||||||||||||| |||||||||||| |||||||||||||||||| ||| ||||||||||||||||||||||||||||  |||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||||| |||||||||||||||||||||| || ||||||||||||||||||||| |||||| | ||||||||||||||||||||||| |||||||||||||| ||||||||||||||||||||||||||||||||||||||||||||||||||| |||||||||||| ||||||||||||||||||||| ||||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||||||||||||||||||||| ||||||||||||||||||||||||| |||| | || |||||||||||||||||||| |||||||||||| |||||||||||||||||||||| ||||||||||||||||||||| |||||||||||||||||||||||||||||||||||||||| | |||||||||| |||||||||| |||||||| |||||||||||||||||||| ||||| ||||||||||| |||||  ||||||||||||| |||||||| |||| || | |||||| ||||||||||||||||||| |||||||||||||||||||||||||||||| |||||| ||||||||||||||||||||||||  ||||||| ||||||||||||| || |||| |||||||||||||||| ||| |||| ||||| |||||||||||||||||||||||||||',
      )
      expect(res.val3).toEqual(
        'TAAGGGC-AGTGGCCGC-ACAACTGCaGATTACTGAC--ACTTGAGTGAGAACTAAGCCTTGAAGCATAGT-GTTG-AATGTTGTAGAAAAGTATAC-TGTGACAAAA-ACAGGGCCTGGTGTCAAGTGTCCTCAGTGATCTGGAT-ATCATCACGCCTTGTTAGCAGGATTTACCCGCATAGTAATGGCCGGACTTTATATTGCCCTGCTGCGCTAGCTAGTACTGCGG-gGGCTCTCtTCCCCCTA-TTGATATtCCGGGCA-GAATGCGCGGGTAGTCAGCATTCATGTCAG-GCTTCTATCAACGT-CTCATTCACcCTTGGA-GTG-TGACCTAC-GTGTTA-GAGGCAATGTAGCCCGAGA-GCCCGTTCAAAGACAAA-CTCCC-G-AATTAAACAGACACCGGTTATGG-GAGTGTGAGT-AGTGACTTCCGACCAGTGTTTGGT-TT-CAGCCT-GT-CGGTTAACCTCGCAGGGCTAGGAGAATGAGCtGCTAG-TAGGTGATTACCGAAGTCTcCCC-AgAAAGGGAACAGTCTTAT-AGAGTAGAGAATGTCAAATAGCGTT-ATTGAGTTCTGTCTACTGCaCTACCAAGAGCATGcCcACCAGAGATGCGTCGCAGTCGTAGCG-TAGACGTCGTAATGACCCAGGTGGCGTTCG-G-CCTATTCGCGTCGGACGCGCGCGCTACTACAACGAA-GGGTtCTGAAAGTGCATGTTCACACTGAAATTCTaAGTGTTAGTAAACAAACGCGTGTATTCCAGGGTCGTGTGTGACAT--TATGGCTGTCTGCGCCCCTCAATGATCATC-AAGACGTTCAATTGTAT-GTTAACGTAGATATCAGGTTTA-GTTATCCGTATACTT-TTTACGCCGCGCGCTTgGAACAGATTCTCCTAACAGCCCTCGCGGTTTCAAAAAGAA-CCAAAGTCTA--TACCATCCTTGTTCcCAATTCTGCCTGGTTGCGGAGAAAAGA-CCGCCTCC-A-TACGTACCCGACTCGGTATTGGTAAGTGGGGAAGCAGTCGAACGCATATTTCT---TGGTTATATCACAGGCCACGTTcTATATC-GGAAGTGGCCGG-ATTACGATTTGACGTTCTATCCCCGAGAGCGCATTCTTGTTTGTTAC-TACTACCACGCGGGCGCTTCTTATTCCCAGACCAGAGGGAATGTGCGGAAGCTT-TTTCCACAGATTGGCGGAAC-TCCaGCGTGCTTAGTGCAGGCGGAGAACGTCCGTTCAGTGGTGCGtGCTTTATTTTtCAATCTGACCCGACCTGCGCTCAAG-GgTTG-C-AAGTTGTTGTGCGC-CCGAGTAATAGGCGACTCGTCGCAATGGGTCTGGTACATT--GCATTTTCATCGGTAC-GGCGCTTCATAAAGTGCGGCAAATTTCTCACCCCAGTACTCATGTTTA-TAGGGTATCAGGACCCGAAGCTTCTCTGTTCCAAAGAAATGTACTGTTTgGCTCCCCTGTCCAT-A-TTGGAGGtAGATCACTTGTGGATT-ATGCAATGAaTGAATGA-AAGTTTGGTGCTCCCCAC-CGGGGCGCTCTC-AAAgAGAGTGAGCtaAATTTGAACATTTAAATTGCTATTCCAACCCGGAGTCCTGACCGGAACAGTAATGAAACTTCAACCATGCCG-GACAGACTAGAAGAAGGGAAAGTtGCTTGTATATGGGAGTaAAAATGATGTTGGTGCCGTAATGGTGCCGG-AAGTgACTATAGA-GCATGTCGTGACGCACCG-G-TAGGCAGTGCTATAATCGTA-TG-TCCTTCAGGCGCCGCCGGACCTACGAAGCTGAaATTAGACACCGGCACACTAGCCCCGTCAGCGACGG-TGCGCGGCCGcT-GCCCTGCAGC-GAATGGGGCTAACACGCATAaAACGCCCGCATAACCACTCGAG-CTACGGGA-ATTCACTCAGGCTGT-TGCTTCGA-CGTGTAGTCTCATTACATAA-TCATAATACCTCCAAGACCAACGGCTGCTCATGACTCTCTTACCTTGTTAG-GGACATTTCGGCACTAGGGAAGAG--CTGAGGACTTTGAAAACGTCGATAAAACCATCGCGGGAACTAG-CT-GCGTTAGA-ACTCCATATTTTACGGGTCGCAAGCTTGAGGTC-CTGTCCCGGC-AGCTGCAAGTGCTACGGCAGGAGGGGATCTACCTAACGTGCAGT-AACGAGCCCc-TGCCC-GTAATGAGGCGTACT-CGTCTCTAATCGTCAGTAAGTTACtATGTCCGAGGACGCC-TCTACGAGTTGAACTCTGGCTA-GGC-CCACCTGTC-CGCGCCCTGCTCGGGTaCCCCATC-TGCTTATCCAA-CtTCACCTCGCCTTACGGAATCTCTGGTTGCCAGTCATCCGATGGTCATT-AAGCAGC-GTGGTACATCGTAGCCA-ATACTT-CAGGGCG-CCAGCCATATTCCc-A--GCCAAG-CGGCTGCATAATTACAGCGCCTGGCACG-ACTAAT-CGATCCCACAAGCCTGGTAGATGACCCTTAG-C-CCTAAAGCGCCCTCTGACCTATCTGCACGTGATACTTGATTaTT-TGT-AATGAGCGGACAGgGTAGATGACTAATAT-ACAGG-GTCGTCTAGGTTTGCACAATG-CAG-AC-A-TCATCCgCGCAAGGCCCGGACGGCTGtACTCACA-CAGCTAGCTCCATCTCCCTCAGCAGCACTAAGATTCCCACGTGACCAGGGCGACGGGCCTCAGCCAAACGTATCCTTGATATCTACTTAAGTCAAGGTTGACTCCGAACCCTATGGGTCGGT-GCCGTTAACAGGGAGTCTATATCTCGGCGTTCCATTGCTTGTTTCAAACTcCTGCTATAAGGTGAAAGCGCTGGAGGGCATAGT-TTATGCCCAAAGTTGCGCGTAGATCCGTCGGGATATG-TGCTATAATAAGGACTGC-TCGAG-GTAGGCGGTAACGG-CTCCCGCCTTCAGTaGGCGCGGAAC-TCGAATCGGAGTTAC-AG-GACTTGACCGA-GTCAT-ATCCAAGTTTATGTTACCCGATCGGATCCGGATGCTCGtATC-TGCGACGAGGTCGG-AAGACGGACGAAATACGATTCAACCGCGCG-AAC-CATTAGCATCTAACCTTTAGCCTCA-ATGGGTGTTAACGTGGTGGGCTCACTCGGCGTACTCTTTGTGCaACTATTC-CGTAT-GAACAACAG-TCAAGTTGCGACATGATGCTCTTACGTGATTCCCACAGTTTCCCACCTCAGGATGCTTTCTTTAGCT-AAA-CCCAATAGTTATGG-CGGCACCTT-CAGACTCCCACGAGGACGGCTATGACGTTGCTAAACCAtTCGCCGCCAAAGGCTAGCGCTAACGAGTTCTGTGAGTTTGTTCCGGGCCAGATCTCCAG-GATGGTCGCAACAACGCAGTACCGGT-TTTATACTGGTGACCCTCTACCTGTtATTAAGTTAcAGCGTTGTCCTACGTACATGGTCGTGAGTAC-TCGCGTAG-TCAAACGCCA--GG-ACTAGCAGCGAGAATTATTGTCGCGATACTTACTACAATAC-TTACCCGATATTGACGTGCAGGGTTGAAAGA-GATGG-ACAGTTGAATATC-TATTTTGACGGAATCCTCAAAACTCCCTCCACCTCAGGTaACGGCCCTGTCCGGGACCGCATTCTTGCATATATTG-GTtCCCAGAGCGTATCTAAGTTAG-TCTCTTGACCGTTCACCGACTC-TAGGGCGACTCGTTATCGCCCTCCGAAA-CGAT-GCTTtCGTTACCTCA-A-TGATGACAG-G-CTGTAACGTA-AGTGATCCCAATCTCACTCGTGCCTTGTCCACCGTTCCGTGAAGACGAAGCAATACGCGGAATACGTGGCTTCGTAATATTTTGACGATATGGGG-CTGGGACGC-TCAAGACTTCCATGACAAACAAAGTGAAGAGCAACTGCAT-CCCTCATCATGA-TCACTATTACCAGAG-TAGCGATGGAtAACGCTAATTTG-GTCAGGGCAGCTATCGCA-TCCCG-cAGGTGTAGGCG-G-AGACTTTTTCTTTTGTTGC-GAGTTGA-CA-GGTAATCTCACGGTATAAGCACGGTTATTTACG-CAAGCGACGTCCCTGGGAGaATCCGCCCACGTAGG-ACCCCATAATCCATAAAT-AC-TGCgGTCGAAACCTTCATATCGTGACAGAACCGCTTTC-TAGGGATG-CGGTCCCCGCATTCAGAGTTCT-ACTTTGGCCAGCGTG-AGACTTAACAACTCCACTTACGCGGTACATTGAAGT-C-GTTCAGTCCAGTGTGACCTGTGTAC-CGAATAACGTGTAGACCAGCGCGTCTACGACTTAGCGCGGCTCCACTCCA-a-AGCACCTTTTGGgACTTTC-CAACGAGC-CTGTTGGCCGTTAAGCGGTATTTCACAAATAGATCACCCTAGTGTCGGTAA-CCGACTACCCTATTGGGATCATCGTGAGCTCGAAACACTAGAGGCGGACCAACGGA--TGACATtTGATTCGGCTCTACAGAGCTTgTCGC-CAGAG-AAAAACTGTGGCAATCTACGCTCGCGGGG-AATTGACTTTAGCGGCCCCT-AGACAGGTGTGGGACACTAGTCTAGATTCACGTCCTACACGACATAACAGCACcTTCCTGGCCAGCCCAGAAATAGTACCTGGACGACATCCAGCCTTCCGACGCCATAATGT-GAGCCGTAGCGCCCACGACGATCAACGAGGAGAAATTTACAA-AGGCTGTGTGAATGCTACGTCGTCTACCATTGC-TCATCGAAACGAACGCAACGCACAGCATACAACGTT-TACCATGCCGGAGCGGGAT-CCTCAAGTACAGAA-AACAGAGGTCTAAACATGATCC-GAACAAATCGGTaGGTTTACACAGCTACCTC-GTC-CATTGGCGTACTGCATCGATCGTGCTTA--CTACGGTCATGCCGGCCCGCGATGCACGTACGAA-GGAATACCCTGTCTGCCCCCGCGCGAGTTACGCTGTCTCGCACATACCGAGCACT-GTCGTTCGAAGCTAAACTATGAGCCCAgCCGAGCTCCTTATGGCCGCAAC-GCtGGTGCGGCCAGCTGATAAATT-CCACAGtA-CACGATCCTCGTGTAAGATCTCG-GGCATAGTAAGTCA-TTTCACATGGTTAGGAGAGATAGAATACATGGTTCTGGTAGCTCAACCAGG-ATTTGTGGAACC-CTTGGCCCTTGGTGAGTGCTA-CAATAAAATTCTCCGTATGGGAC-AACCAAAGGGTGCTGGATGTGACTTCCCGGCCCAGGTTAGATGTCCATATCATTCATA-CATTGCCCGACCGACCCAATGCCTA-AATC-A-GA-GGCGCCTTAGCTAGTTCTTGtAGTGTGCCACGT-CCGGCCACGCAGACACGACCCT-CGGCGAGTGATCACCATTACC-GGATTGGCATCGAAGTCTTTTTCTGGGAAGTTAGCCAGTTtG-GTGTGCGGTG-CTTAGAATCT-TATTCCCA-GTCAAACGCCCCTGGGACGA-ATTGC-TAACCCTAGTT-GCCAC-gCCGGAACCATCTT-CGGGAGAG-TAGA-CA-A-ATCCGA-GTTAGATATGTTAGCGTCT-TCGTGAGTCTGAAATGTATCACTTCACCGC-AGAATA-CGCGAATGTCTGTTTGCCCTGGAC--TGACGGAaTTGGCTTAAAAGC-CGaCTAG-AGCATTTTGGTACGGT-TCCtATCC-GCGAT-GTAATTACCTATCTAGGTTATCGCTAG',
      )
    })
  })
  // only run the cabone_test_2 if it's in the URL someplace
  if (document.location.href.indexOf('extended_tests=1') > -1) {
    describe('BAM with carbone_test_2', function () {
      var b
      beforeEach(function () {
        b = new BAMStore({
          browser: new Browser({ unitTestMode: true }),
          bam: new XHRBlob(
            '../../../data/carbone_test_2/RIB40_278_k51_cd_hit_est_sorted.bam',
          ),
          bai: new XHRBlob(
            '../../../data/carbone_test_2/RIB40_278_k51_cd_hit_est_sorted.bam.bai',
          ),
          refSeq: {
            name: 'gi|338162049|dbj|BA000051.1|',
            start: 1,
            end: 5123684,
          },
        })
      })

      it('loads some data', function () {
        var loaded
        var features = []
        var done
        aspect.after(b, 'loadSuccess', function () {
          loaded = true
        })

        // need 2:3905491-4019507 NODE_423_length_210786_cov_16.121635 3919331 3979772

        b.getFeatures(
          { start: 3799999, end: 4049999 },
          function (feature) {
            features.push(feature)
          },
          function () {
            done = true
          },
        )
        waitsFor(function () {
          return done
        }, 2000)
        runs(function () {
          expect(features.length).toEqual(13)
          //console.log( distinctBins(features) );
        })
      })
    })
  }
})
