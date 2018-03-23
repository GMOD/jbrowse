define([
           'dojo/_base/declare',
           './_IndexedFileDriver'
       ],
       function( declare, IndexedFileDriver ) {
return declare( IndexedFileDriver,  {
    name: 'BAM',
    storeType: 'JBrowse/Store/SeqFeature/BAM',

    fileType: 'bam',

    fileExtensions: ['bam'],
    fileConfKey: 'bam',
    fileUrlConfKey: 'urlTemplate',

    indexExtensions: ['bam.bai','bai'],
    indexConfKey: 'bai',
    indexUrlConfKey: 'baiUrlTemplate'
});

});
