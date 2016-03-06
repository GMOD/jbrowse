define([
           'dojo/_base/declare',
           'JBrowse/Util',
           'JBrowse/Model/FileBlob',
           'JBrowse/Model/XHRBlob'
       ],
       function( declare, Util, FileBlob, XHRBlob ) {

var uniqCounter = 0;
return declare( null,  {
    name: 'FASTA',
    storeType: 'JBrowse/Store/SeqFeature/UnindexedFasta',

    fileExtension: 'fasta',
    fileConfKey: 'fasta',
    fileUrlConfKey: 'urlTemplate',



    tryResource: function( configs, resource ) {
        if( resource.type == 'fasta' ) {
            var basename = Util.basename(
                resource.file ? resource.file.name :
                resource.url  ? resource.url       :
                                '',
                [ '.fasta','.fa' ]
            );
            if( !basename )
                return false;

            var newName = 'FASTA_'+basename+'_'+uniqCounter++;
            configs[newName] = {
                fileBasename: basename,
                type: this.storeType,
                blob: this._makeBlob( resource ),
                name: newName
            };
            return true;
        }
        else
            return false;
    },

    // try to merge any singleton BAM and BAI stores.  currently can only do this if there is one of each
    finalizeConfiguration: function( configs ) {
        var deleteme = false;
        for( var conf in configs ) {
            if(configs[conf].fai) deleteme = true;
        }
        var fasta;
        for( var conf in configs ) {
            if( deleteme && configs[conf].type == "JBrowse/Store/SeqFeature/UnindexedFasta") {
                fasta = configs[conf].blob;
                delete configs[conf];
            }
        }
        for( var conf in configs ) {
            if( deleteme && configs[conf].type == "JBrowse/Store/SeqFeature/IndexedFasta") {
                configs[conf].fasta = fasta;
            }
        }
    },

    _makeBlob: function( resource ) {
        var r = resource.file ? new FileBlob( resource.file ) :
                resource.url  ? new XHRBlob( resource.url )   :
                                null;
        if( ! r )
            throw 'unknown resource type';
        return r;

    },

    confIsValid: function( conf ) {
        return conf.blob || conf.urlTemplate;
    }

});

});
