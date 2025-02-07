define(['dojo/_base/declare', './_MultiIndexedFileDriver'], function (
  declare,
  MultiIndexedFileDriver,
) {
  return declare(MultiIndexedFileDriver, {
    name: 'VCF+Tabix',
    storeType: 'JBrowse/Store/SeqFeature/VCFTabix',

    fileExtension: 'vcf.gz',
    fileConfKey: 'file',
    fileUrlConfKey: 'urlTemplate',

    indexTypes: [
      {
        indexExtension: 'vcf.gz.tbi',
        indexConfKey: 'tbi',
        indexUrlConfKey: 'tbiUrlTemplate',
      },
      {
        indexExtension: 'vcf.gz.csi',
        indexConfKey: 'csi',
        indexUrlConfKey: 'csiUrlTemplate',
      },
    ],
  })
})
