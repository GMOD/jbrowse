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

    indexExtension: 'bam.bai',
    indexConfKey: 'bai',
    indexUrlConfKey: 'baiUrlTemplate'
});

});
