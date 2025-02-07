import dompurify from 'dompurify'

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/dom-construct',
  'dijit/form/Select',
], function (declare, array, dom, Select) {
  return declare(null, {
    constructor: function (args) {
      this.dialog = args.dialog
      this.domNode = dom.create('div', { className: 'resourceList' })
      this._updateView()
    },

    clearLocalFiles: function () {
      this._resources = array.filter(this._resources || [], function (res) {
        return !res.file
      })
      this._notifyChange()
    },

    _notifyChange: function () {
      this.onChange(
        array.map(this._resources || [], function (res) {
          var r = {}
          if (res.file) {
            r.file = res.file
          }
          if (res.url) {
            r.url = res.url
          }
          r.type = res.type.get('value')
          return r
        }),
      )
    },

    _addResources: function (resources) {
      var seenFile = {}
      var allRes = (this._resources || []).concat(resources)
      this._resources = array
        .filter(allRes.reverse(), function (res) {
          var key = (res.file && res.file.name) || res.url
          if (seenFile[key]) {
            return false
          }
          seenFile[key] = true
          return true
        })
        .reverse()

      this._updateView()
      this._notifyChange()
    },

    addLocalFiles: function (fileList) {
      this._addResources(
        array.map(fileList, function (file) {
          return { file: file }
        }),
      )
    },

    clearURLs: function () {
      this._resources = array.filter(this._resources || [], function (res) {
        return !res.url
      })
      this._notifyChange()
    },
    addURLs: function (urls) {
      this._addResources(
        array.map(urls, function (u) {
          return { url: u }
        }),
      )
    },

    // old-style handler stub
    onChange: function () {},

    _updateView: function () {
      var container = this.domNode
      dom.empty(container)

      dom.create('h3', { innerHTML: 'Files and URLs' }, container)

      if ((this._resources || []).length) {
        var table = dom.create('table', {}, container)

        // render rows in the resource table for each resource in our
        // list
        array.forEach(
          this._resources,
          function (res, i) {
            var that = this
            var tr = dom.create('tr', {}, table)
            var name = res.url || res.file.name

            // make a selector for the resource's type
            var typeSelect = new Select({
              options: [
                {
                  // false positive
                  // eslint-disable-next-line xss/no-mixed-html
                  label: '<span class="ghosted">file type?</span>',
                  value: null,
                },
                { label: 'GFF3', value: 'gff3' },
                { label: 'GTF', value: 'gtf' },
                { label: 'BigWig', value: 'bigwig' },
                { label: 'BAM', value: 'bam' },
                { label: 'BAM index', value: 'bam.bai' },
                { label: 'FASTA', value: 'fasta' },
                { label: 'FASTA index', value: 'fai' },
                { label: 'BGZIP FASTA', value: 'fasta.gz' },
                {
                  label: 'BGZIP FASTA index (.gz.fai)',
                  value: 'fasta.gz.fai',
                },
                {
                  label: 'BGZIP index (.gz.gzi)',
                  value: 'gzi',
                },
                { label: '2bit', value: '2bit' },
                { label: 'BigBed', value: 'bb' },
                { label: 'VCF+bgzip', value: 'vcf.gz' },
                { label: 'VCF', value: 'vcf' },
                { label: 'IGV/GATK Index', value: 'idx' },
                { label: 'BED+bgzip', value: 'bed.gz' },
                { label: 'BED', value: 'bed' },
                { label: 'GFF3+bgzip', value: 'gff3.gz' },
                {
                  label: 'VCF+Tabix index',
                  value: 'vcf.gz.tbi',
                },
                {
                  label: 'GFF3+Tabix index',
                  value: 'gff3.gz.tbi',
                },
                {
                  label: 'BED+Tabix index',
                  value: 'bed.gz.tbi',
                },
                { label: 'BED+CSI index', value: 'bed.gz.csi' },
                { label: 'VCF+CSI index', value: 'vcf.gz.csi' },
                {
                  label: 'GFF3+CSI index',
                  value: 'gff3.gz.csi',
                },
                { label: 'BAM+CSI index', value: 'bam.csi' },
                { label: 'CRAM', value: 'cram' },
                { label: 'CRAM index', value: 'cram.crai' },
                { label: 'Chrom sizes', value: 'chrom.sizes' },
              ],
              value: this.guessType(name),
              onChange: function () {
                that._rememberedTypes = that._rememberedTypes || {}
                that._rememberedTypes[name] = this.get('value')
                that._notifyChange()
              },
            })
            typeSelect.placeAt(dojo.create('td', { width: '4%' }, tr))
            res.type = typeSelect

            dojo.create(
              'td',
              {
                width: '1%',
                // eslint-disable-next-line xss/no-mixed-html
                innerHTML: dompurify.sanitize(
                  `<div class="${
                    res.file ? 'dijitIconFile' : 'jbrowseIconLink'
                  }"/>`,
                ),
              },
              tr,
            )
            dojo.create(
              'td',
              {
                // eslint-disable-next-line xss/no-mixed-html
                innerHTML: dompurify.sanitize(name),
              },
              tr,
            )
            dojo.create(
              'td',
              {
                width: '1%',
                innerHTML: '<div class="dijitIconDelete"></div>',
                onclick: function (e) {
                  e.preventDefault && e.preventDefault()
                  that.deleteResource(res)
                },
              },
              tr,
            )
          },
          this,
        )
      } else {
        dom.create(
          'div',
          {
            className: 'emptyMessage',
            innerHTML: 'Add files and URLs using the controls above.',
          },
          container,
        )
      }

      // little elements used to show pipeline-like connections between the controls
      dom.create(
        'div',
        { className: 'connector', innerHTML: '&nbsp;' },
        container,
      )
    },

    deleteResource: function (resource) {
      this._resources = array.filter(this._resources || [], function (res) {
        return res !== resource
      })
      this._updateView()
      this._notifyChange()
    },

    guessType: function (name) {
      return (
        (this._rememberedTypes || {})[name] ||
        (/\.bam$/i.test(name)
          ? 'bam'
          : /\.bai$/i.test(name)
            ? 'bam.bai'
            : /\.gff3?$/i.test(name)
              ? 'gff3'
              : /\.gtf?$/i.test(name)
                ? 'gtf'
                : /\.(bw|bigwig)$/i.test(name)
                  ? 'bigwig'
                  : /\.(fa|fasta|fna|mfa)$/i.test(name)
                    ? 'fasta'
                    : /\.(fa|fasta|fna|mfa)\.gz$/i.test(name)
                      ? 'fasta.gz'
                      : /\.(fa|fasta|fna|mfa)\.gz\.fai$/i.test(name)
                        ? 'fasta.gz.fai'
                        : /\.2bit$/i.test(name)
                          ? '2bit'
                          : /\.fai$/i.test(name)
                            ? 'fai'
                            : /\.idx$/i.test(name)
                              ? 'idx'
                              : /\.vcf$/i.test(name)
                                ? 'vcf'
                                : /\.vcf\.gz$/i.test(name)
                                  ? 'vcf.gz'
                                  : /\.bed\.gz$/i.test(name)
                                    ? 'bed.gz'
                                    : /\.gzi$/i.test(name)
                                      ? 'gzi'
                                      : /\.gff3?\.gz$/i.test(name)
                                        ? 'gff3.gz'
                                        : /\.bed$/i.test(name)
                                          ? 'bed'
                                          : /\.(bb|bigbed)$/i.test(name)
                                            ? 'bb'
                                            : /\.gff3?\.gz.tbi$/i.test(name)
                                              ? 'gff3.gz.tbi'
                                              : /\.vcf.gz.tbi$/i.test(name)
                                                ? 'vcf.gz.tbi'
                                                : /\.bed.gz.tbi$/i.test(name)
                                                  ? 'bed.gz.tbi'
                                                  : /\.bed.gz.csi/i.test(name)
                                                    ? 'bed.gz.csi'
                                                    : /\.gff3?\.gz.csi$/i.test(
                                                          name,
                                                        )
                                                      ? 'gff3.gz.csi'
                                                      : /\.vcf.gz.csi$/i.test(
                                                            name,
                                                          )
                                                        ? 'vcf.gz.csi'
                                                        : /\.bam.csi$/i.test(
                                                              name,
                                                            )
                                                          ? 'bam.csi'
                                                          : /\.cram$/i.test(
                                                                name,
                                                              )
                                                            ? 'cram'
                                                            : /\.crai$/i.test(
                                                                  name,
                                                                )
                                                              ? 'cram.crai'
                                                              : /\.sizes$/i.test(
                                                                    name,
                                                                  )
                                                                ? 'chrom.sizes'
                                                                : null)
      )
    },
  })
})
