define(['dojo/_base/declare', './_OptionallyIndexedFileDriver'], function (
  declare,
  OptionallyIndexedFileDriver,
) {
  return declare(OptionallyIndexedFileDriver, {
    name: 'FASTA',
    storeType: 'JBrowse/Store/SeqFeature/IndexedFasta',
    unindexedStoreType: 'JBrowse/Store/SeqFeature/UnindexedFasta',

    fileExtension: 'fasta',
    fileConfKey: 'fasta',
    fileUrlConfKey: 'urlTemplate',

    indexExtension: 'fai',
    indexConfKey: 'fai',
    indexUrlConfKey: 'faiUrlTemplate',
  })
})
