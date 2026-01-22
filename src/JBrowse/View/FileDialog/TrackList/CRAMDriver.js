define(['dojo/_base/declare', './_IndexedFileDriver'], function (
  declare,
  IndexedFileDriver,
) {
  return declare(IndexedFileDriver, {
    name: 'CRAM',
    storeType: 'JBrowse/Store/SeqFeature/CRAM',

    fileExtension: 'cram',
    fileConfKey: 'cram',
    fileUrlConfKey: 'urlTemplate',

    indexExtension: 'cram.crai',
    indexConfKey: 'crai',
    indexUrlConfKey: 'craiUrlTemplate',
  })
})
