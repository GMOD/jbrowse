define([
           'dojo/_base/declare',
           './_IndexedFileDriver'
       ],
       function( declare, IndexedFileDriver ) {
return declare( IndexedFileDriver,  {
    name: 'BAM',
    storeType: 'JBrowse/Store/SeqFeature/BAM',

    fileExtension: 'bam',
    fileConfKey: 'bam',
    fileUrlConfKey: 'urlTemplate',

    indexExtension: 'bai',
    indexConfKey: 'bai',
    indexUrlConfKey: 'baiUrlTemplate'
});

});
