define([
    'dojo/_base/declare',
    './_IndexedFileDriver'
],
function( declare, IndexedFileDriver ) {

return declare( IndexedFileDriver,  {
    name: 'BED+Tabix',
    storeType: 'JBrowse/Store/SeqFeature/BEDTabix',

    fileType: "bed.gz",

    fileExtensions: ['bed.gz'],
    fileConfKey: 'file',
    fileUrlConfKey: 'urlTemplate',

    indexExtensions: ['bed.gz.tbi'],
    indexConfKey: 'tbi',
    indexUrlConfKey: 'tbiUrlTemplate'
});

});

