define(['dojo/_base/declare', './_MultiIndexedFileDriver'], function (
  declare,
  MultiIndexedFileDriver,
) {
  return declare(MultiIndexedFileDriver, {
    name: 'BAM',
    storeType: 'JBrowse/Store/SeqFeature/BAM',

    fileExtension: 'bam',
    fileConfKey: 'bam',
    fileUrlConfKey: 'urlTemplate',

    indexTypes: [
      {
        indexExtension: 'bam.bai',
        indexConfKey: 'bai',
        indexUrlConfKey: 'baiUrlTemplate',
      },
      {
        indexExtension: 'bam.csi',
        indexConfKey: 'csi',
        indexUrlConfKey: 'csiUrlTemplate',
      },
    ],
  })
})
