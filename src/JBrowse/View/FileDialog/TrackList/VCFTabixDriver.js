define([
           'dojo/_base/declare',
           './_MultiIndexedFileDriver'
       ],
       function( declare, MultiIndexedFileDriver ) {
return declare( MultiIndexedFileDriver,  {
    name: 'VCF+Tabix',
    storeType: 'JBrowse/Store/SeqFeature/VCFTabix',

    fileExtension: 'vcf.gz',
    fileConfKey: 'file',
    fileUrlConfKey: 'urlTemplate',

    indexTypes: [{
        ext: 'vcf.gz.tbi',
        confKey: 'tbi',
        urlConfKey: 'tbiUrlTemplate'
    }, {
        ext: 'vcf.gz.csi',
        confKey: 'csi',
        urlConfKey: 'csiUrlTemplate'
    }]
});

});
