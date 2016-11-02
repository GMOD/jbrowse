define([
           'dojo/_base/declare',
           './_IndexedFileDriver'
       ],
       function( declare, IndexedFileDriver ) {
return declare( IndexedFileDriver,  {
    name: 'GFF3+Tabix',
    storeType: 'JBrowse/Store/SeqFeature/GFF3Tabix',

    fileExtension: 'gff3.gz',
    fileConfKey: 'file',
    fileUrlConfKey: 'urlTemplate',

    indexExtension: 'gff3.gz.tbi',
    indexConfKey: 'tbi',
    indexUrlConfKey: 'tbiUrlTemplate'


});

});
