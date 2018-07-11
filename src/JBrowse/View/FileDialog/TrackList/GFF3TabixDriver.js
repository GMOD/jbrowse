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
    indexTypes: [{
        indexExtension: 'gff3.gz.tbi',
        indexConfKey: 'tbi',
        indexUrlConfKey: 'tbiUrlTemplate'
    }, {
        indexExtension: 'gff3.gz.csi',
        indexConfKey: 'csi',
        indexUrlConfKey: 'csiUrlTemplate'
    }]
});

});
