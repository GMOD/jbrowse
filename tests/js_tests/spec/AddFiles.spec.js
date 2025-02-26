require([
  'JBrowse/View/FileDialog/TrackList/BAMDriver',
  'JBrowse/View/FileDialog/TrackList/GFF3TabixDriver',
  'JBrowse/View/FileDialog/TrackList/IndexedFASTADriver',
  'JBrowse/View/FileDialog/TrackList/BgzipIndexedFASTADriver',
], function (
  BAMDriver,
  GFF3TabixDriver,
  IndexedFastaDriver,
  BgzipIndexedFastaDriver,
) {
  describe('FileDialog drivers', function () {
    it('can match a simple BAM URL with its BAI URL', function () {
      var confs = { foo: { baiUrlTemplate: 'zee.bam.bai' } }
      expect(
        new BAMDriver().tryResource(confs, { type: 'bam', url: 'zee.bam' }),
      ).toBeTruthy()
      expect(confs.foo.bam.url).toEqual('zee.bam')
    })

    it('can match a simple BAM file with its BAI URL', function () {
      var confs = { foo: { baiUrlTemplate: 'zee.bam.bai' } }
      expect(
        new BAMDriver().tryResource(confs, {
          type: 'bam',
          file: { name: 'zee.bam' },
        }),
      ).toBeTruthy()
      expect(confs.foo.bam.blob.name).toEqual('zee.bam')
    })

    it('can match a simple BAM file with its BAI XHRBlob', function () {
      var confs = { foo: { bai: { url: 'zee.bam.bai' } } }
      expect(
        new BAMDriver().tryResource(confs, {
          type: 'bam',
          file: { name: 'zee.bam' },
        }),
      ).toBeTruthy()
      expect(confs.foo.bam.blob.name).toEqual('zee.bam')
    })

    it('can match a simple BAM file with its CSI XHRBlob', function () {
      var confs = { foo: { csi: { url: 'zee.bam.csi' } } }
      expect(
        new BAMDriver().tryResource(confs, {
          type: 'bam',
          file: { name: 'zee.bam' },
        }),
      ).toBeTruthy()
      expect(confs.foo.bam.blob.name).toEqual('zee.bam')
    })

    it('can remove singleton BAM file', function () {
      var confs = {}
      var driver = new BAMDriver()
      expect(
        driver.tryResource(confs, { type: 'bam', file: { name: 'zee.bam' } }),
      ).toBeTruthy()
      driver.finalizeConfiguration(confs)
      expect(confs).toEqual({})
    })
    it('can remove singleton CSI file', function () {
      var confs = {}
      var driver = new BAMDriver()
      driver.tryResource(confs, {
        type: 'bam.csi',
        file: { name: 'zee.bam.csi' },
      })
      driver.finalizeConfiguration(confs)
      expect(confs).toEqual({})
    })

    it('can finalize with CSI+BAM file', function () {
      var confs = { foo: { csi: { url: 'zee.bam.csi' } } }
      var driver = new BAMDriver()
      expect(
        driver.tryResource(confs, { type: 'bam', file: { name: 'zee.bam' } }),
      ).toBeTruthy()
      driver.finalizeConfiguration(confs)
      expect(confs.foo.bam.blob.name).toEqual('zee.bam')
      expect(confs.foo.csi.url).toEqual('zee.bam.csi')
    })

    it('can finalize with opposite order, BAM+CSI file', function () {
      var confs = { foo: { bam: { url: 'zee.bam' } } }
      var driver = new BAMDriver()
      expect(
        driver.tryResource(confs, {
          type: 'bam.csi',
          file: { name: 'zee.bam.csi' },
        }),
      ).toBeTruthy()
      driver.finalizeConfiguration(confs)
      expect(confs.foo.csi.blob.name).toEqual('zee.bam.csi')
      expect(confs.foo.bam.url).toEqual('zee.bam')
    })

    it('can finalize with opposite order, both blobs', function () {
      var confs = { foo: { bam: { blob: { name: 'zee.bam' } } } }
      var driver = new BAMDriver()
      expect(
        driver.tryResource(confs, {
          type: 'bam.csi',
          file: { name: 'zee.bam.csi' },
        }),
      ).toBeTruthy()
      driver.finalizeConfiguration(confs)
      expect(confs.foo.csi.blob.name).toEqual('zee.bam.csi')
      expect(confs.foo.bam.blob.name).toEqual('zee.bam')
    })

    it('GFF3 tabix file extension test with .gff3', function () {
      var confs = { foo: { file: { blob: { name: 'zee.gff3.gz' } } } }
      var driver = new GFF3TabixDriver()
      expect(
        driver.tryResource(confs, {
          type: 'gff3.gz.tbi',
          file: { name: 'zee.gff3.gz.tbi' },
        }),
      ).toBeTruthy()
      driver.finalizeConfiguration(confs)
      expect(confs.foo.tbi.blob.name).toEqual('zee.gff3.gz.tbi')
      expect(confs.foo.file.blob.name).toEqual('zee.gff3.gz')
    })

    it('GFF3 tabix file extension test with .gff', function () {
      var confs = { foo: { file: { blob: { name: 'zee.gff.gz' } } } }
      var driver = new GFF3TabixDriver()
      expect(
        driver.tryResource(confs, {
          type: 'gff3.gz.tbi',
          file: { name: 'zee.gff.gz.tbi' },
        }),
      ).toBeTruthy()
      driver.finalizeConfiguration(confs)
      expect(confs.foo.tbi.blob.name).toEqual('zee.gff.gz.tbi')
      expect(confs.foo.file.blob.name).toEqual('zee.gff.gz')
    })
    it('FASTA file extension test with .fasta', function () {
      var confs = { foo: { fasta: { blob: { name: 'zee.fasta' } } } }
      var driver = new IndexedFastaDriver()
      expect(
        driver.tryResource(confs, {
          type: 'fai',
          file: { name: 'zee.fasta.fai' },
        }),
      ).toBeTruthy()
      driver.finalizeConfiguration(confs)
      expect(confs.foo.fai.blob.name).toEqual('zee.fasta.fai')
      expect(confs.foo.fasta.blob.name).toEqual('zee.fasta')
    })
    it('FASTA file extension test with .fa', function () {
      var confs = { foo: { fasta: { blob: { name: 'zee.fa' } } } }
      var driver = new IndexedFastaDriver()
      expect(
        driver.tryResource(confs, {
          type: 'fai',
          file: { name: 'zee.fa.fai' },
        }),
      ).toBeTruthy()
      driver.finalizeConfiguration(confs)
      expect(confs.foo.fai.blob.name).toEqual('zee.fa.fai')
      expect(confs.foo.fasta.blob.name).toEqual('zee.fa')
    })
    it('FASTA file unindexed', function () {
      var confs = { foo: { fasta: { blob: { name: 'zee.fa' } } } }
      var driver = new IndexedFastaDriver()
      driver.finalizeConfiguration(confs)
      expect(confs.foo.fasta.blob.name).toEqual('zee.fa')
    })

    it('BGZIP FASTA file variant 1', function () {
      var confs = { foo: { bgzfa: { blob: { name: 'zee.fa.gz' } } } }
      var driver = new BgzipIndexedFastaDriver()
      expect(
        driver.tryResource(confs, {
          type: 'fasta.gz.fai',
          file: { name: 'zee.fa.gz.fai' },
        }),
      ).toBeTruthy()
      expect(
        driver.tryResource(confs, {
          type: 'gzi',
          file: { name: 'zee.fa.gz.gzi' },
        }),
      ).toBeTruthy()
      driver.finalizeConfiguration(confs)
      expect(confs.foo.fai.blob.name).toEqual('zee.fa.gz.fai')
      expect(confs.foo.gzi.blob.name).toEqual('zee.fa.gz.gzi')
      expect(confs.foo.bgzfa.blob.name).toEqual('zee.fa.gz')
    })

    it('BGZIP FASTA file variant 2', function () {
      var confs = { foo: { fai: { blob: { name: 'zee.fa.gz.fai' } } } }
      var driver = new BgzipIndexedFastaDriver()
      expect(
        driver.tryResource(confs, {
          type: 'fasta.gz',
          file: { name: 'zee.fa.gz' },
        }),
      ).toBeTruthy()
      expect(
        driver.tryResource(confs, {
          type: 'gzi',
          file: { name: 'zee.fa.gz.gzi' },
        }),
      ).toBeTruthy()
      driver.finalizeConfiguration(confs)
      expect(confs.foo.fai.blob.name).toEqual('zee.fa.gz.fai')
      expect(confs.foo.gzi.blob.name).toEqual('zee.fa.gz.gzi')
      expect(confs.foo.bgzfa.blob.name).toEqual('zee.fa.gz')
    })

    it('BGZIP FASTA file variant 3', function () {
      var confs = { foo: { bgzfa: { blob: { name: 'zee.fa.gz' } } } }
      var driver = new BgzipIndexedFastaDriver()
      expect(
        driver.tryResource(confs, {
          type: 'gzi',
          file: { name: 'zee.fa.gz.gzi' },
        }),
      ).toBeTruthy()
      expect(
        driver.tryResource(confs, {
          type: 'fasta.gz.fai',
          file: { name: 'zee.fa.gz.fai' },
        }),
      ).toBeTruthy()
      driver.finalizeConfiguration(confs)
      expect(confs.foo.fai.blob.name).toEqual('zee.fa.gz.fai')
      expect(confs.foo.gzi.blob.name).toEqual('zee.fa.gz.gzi')
      expect(confs.foo.bgzfa.blob.name).toEqual('zee.fa.gz')
    })
  })
})
