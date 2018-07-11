define([
           'dojo/_base/declare',
           './_MultiIndexedFileDriver'
       ],
       function( declare, MultiIndexedFileDriver ) {
return declare( MultiIndexedFileDriver,  {
    name: 'GFF3+Tabix',
    storeType: 'JBrowse/Store/SeqFeature/GFF3Tabix',

    fileExtension: 'gff3.gz',
    fileConfKey: 'file',
    fileUrlConfKey: 'urlTemplate',

    indexType: [{
        ext: 'gff3.gz.tbi',
        confKey: 'tbi',
        urlConfKey: 'tbiUrlTemplate'
    }, {
        ext: 'gff3.gz.csi',
        confKey: 'csi',
        urlConfKey: 'csiUrlTemplate'
    }]
});

});
