define([
           'dojo/_base/declare',
           './_IndexedFileDriver'
       ],
       function( declare, IndexedFileDriver ) {
return declare( IndexedFileDriver,  {
    name: 'GFF3+Tabix',
    storeType: 'JBrowse/Store/SeqFeature/GFF3Tabix',

    fileType: 'gff3.gz',

    fileExtensions: ['gff3.gz'],
    fileConfKey: 'file',
    fileUrlConfKey: 'urlTemplate',

    indexExtensions: ['gff3.gz.tbi'],
    indexConfKey: 'tbi',
    indexUrlConfKey: 'tbiUrlTemplate'


});

});
