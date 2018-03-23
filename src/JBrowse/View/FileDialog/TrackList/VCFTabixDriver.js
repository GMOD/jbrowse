define([
           'dojo/_base/declare',
           './_IndexedFileDriver'
       ],
       function( declare, IndexedFileDriver ) {
return declare( IndexedFileDriver,  {
    name: 'VCF+Tabix',
    storeType: 'JBrowse/Store/SeqFeature/VCFTabix',

    fileType: 'vcf.gz',

    fileExtensions: ['vcf.gz'],
    fileConfKey: 'file',
    fileUrlConfKey: 'urlTemplate',

    indexExtensions: ['vcf.gz.tbi'],
    indexConfKey: 'tbi',
    indexUrlConfKey: 'tbiUrlTemplate'
});

});
