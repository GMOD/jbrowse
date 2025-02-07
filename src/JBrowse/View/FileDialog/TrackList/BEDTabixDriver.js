define(['dojo/_base/declare', './_IndexedFileDriver'], function (
  declare,
  IndexedFileDriver,
) {
  return declare(IndexedFileDriver, {
    name: 'BED+Tabix',
    storeType: 'JBrowse/Store/SeqFeature/BEDTabix',

    fileExtension: 'bed.gz',
    fileConfKey: 'file',
    fileUrlConfKey: 'urlTemplate',

    indexExtension: 'bed.gz.tbi',
    indexConfKey: 'tbi',
    indexUrlConfKey: 'tbiUrlTemplate',
  })
})
