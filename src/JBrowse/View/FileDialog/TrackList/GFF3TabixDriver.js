define(['dojo/_base/declare', './_MultiIndexedFileDriver'], function (
  declare,
  MultiIndexedFileDriver,
) {
  return declare(MultiIndexedFileDriver, {
    name: 'GFF3+Tabix',
    storeType: 'JBrowse/Store/SeqFeature/GFF3Tabix',

    fileExtension: 'gff3.gz',
    fileExtensionMap: ['.gff3.gz', '.gff.gz'],
    fileConfKey: 'file',
    fileUrlConfKey: 'urlTemplate',
    indexTypes: [
      {
        indexExtension: 'gff3.gz.tbi',
        indexExtensionMap: ['.gff3.gz.tbi', '.gff.gz.tbi'],
        indexConfKey: 'tbi',
        indexUrlConfKey: 'tbiUrlTemplate',
      },
      {
        indexExtension: 'gff3.gz.csi',
        indexExtensionMap: ['.gff3.gz.csi', '.gff.gz.csi'],
        indexConfKey: 'csi',
        indexUrlConfKey: 'csiUrlTemplate',
      },
    ],
  })
})
