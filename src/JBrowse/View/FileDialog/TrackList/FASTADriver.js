define([
           'dojo/_base/declare',
           './_IndexedFileDriver'
       ],
       function( declare, IndexedFileDriver ) {
return declare( IndexedFileDriver,  {
    name: 'BAM',
    storeType: 'JBrowse/Store/Sequence/IndexedFasta',

    fileExtension: 'fasta',
    fileConfKey: 'fasta',
    fileUrlConfKey: 'urlTemplate',

    indexExtension: 'fai',
    indexConfKey: 'fai',
    indexUrlConfKey: 'faiUrlTemplate'
});

});
