define(['dojo/_base/declare', './_IndexedFileDriver'], function (
  declare,
  IndexedFileDriver,
) {
  return declare(IndexedFileDriver, {
    name: 'VCF+IDX',
    storeType: 'JBrowse/Store/SeqFeature/VCFTribble',

    fileExtension: 'vcf',
    fileConfKey: 'file',
    fileUrlConfKey: 'urlTemplate',

    indexExtension: 'idx',
    indexConfKey: 'idx',
    indexUrlConfKey: 'idxUrlTemplate',
  })
})
