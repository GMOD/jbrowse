define([
           'dojo/_base/declare',
           './_IndexedFileDriver'
       ],
       function( declare, IndexedFileDriver ) {
return declare( IndexedFileDriver,  {
    name: 'FASTA',
    storeType: 'JBrowse/Store/SeqFeature/IndexedFasta',

    fileExtension: 'fasta',
    fileConfKey: 'fasta',
    fileUrlConfKey: 'urlTemplate',

    indexExtension: 'fai',
    indexConfKey: 'fai',
    indexUrlConfKey: 'faiUrlTemplate',


    tryResource: function(configs, resource) {
        this.inherited(arguments);
    },
    finalizeConfiguration: function(configs) {
        this.inherited(arguments);
        for(var i in configs) {
            var config = configs[i];
            if( !config.fai && !config.blob ) {
                // if no fai, change to UnindexedFasta
                config.type = "JBrowse/Store/SeqFeature/UnindexedFasta";
            }
        }
    }
});

});
