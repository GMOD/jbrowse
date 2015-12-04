define([
           'dojo/_base/declare',
           './_IndexedFileDriver'
       ],
       function( declare, IndexedFileDriver ) {
return declare( IndexedFileDriver,  {
    name: 'FASTA',
    storeType: 'JBrowse/Store/SeqFeature/UnindexedFasta',

    fileExtension: 'fasta',
    fileConfKey: 'fasta',
    fileUrlConfKey: 'urlTemplate',

});

});
