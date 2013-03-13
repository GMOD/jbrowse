define([
           'dojo/_base/declare',
           './_IndexedFileDriver'
       ],
       function( declare, IndexedFileDriver ) {
return declare( IndexedFileDriver,  {
    name: 'VCF+Tabix',
    storeType: 'JBrowse/Store/SeqFeature/VCFTabix',

    fileExtension: 'vcf.gz',
    fileConfKey: 'file',
    fileUrlConfKey: 'urlTemplate',

    indexExtension: 'tbi',
    indexConfKey: 'tbi',
    indexUrlConfKey: 'tbiUrlTemplate'
});

});
