define([
           'JBrowse/Util',
           'JBrowse/Model/FileBlob',
           'JBrowse/Model/XHRBlob'
       ],
       function( Util, FileBlob, XHRBlob ) {
var uniqCounter = 0;
return {

    storeType: 'JBrowse/Store/SeqFeature/BAM',

    tryResource: function( configs, resource ) {
        if( resource.type == 'bam' ) {
            var basename = Util.basename(
                resource.file ? resource.file.name :
                resource.url  ? resource.url       :
                                ''
            );
            if( !basename )
                return false;

            // go through the configs and see if there is one with a BAI that seems to match
            for( var n in configs ) {
                var c = configs[n];
                if( Util.basename( c.bai ? c.bai.url || c.bai.blob.name : c.baiUrlTemplate, '.bai' ) == basename ) {
                    // it's a match, put it in
                    c.bam = this._makeBlob( resource );
                    return true;
                }
            }
            // go through again and look for BAIs that don't have .bam on them
            basename = Util.basename( basename, '.bam' );
            for( var n in configs ) {
                var c = configs[n];
                if( Util.basename( c.bai ? c.bai.url || c.bai.blob.name : c.baiUrlTemplate, '.bai' ) == basename ) {
                    // it's a match, put it in
                    c.bam = this._makeBlob( resource );
                    return true;
                }
            }

            // otherwise make a new store config for it
            var newName = 'BAM_'+basename+'_'+uniqCounter++;
            configs[newName] = {
                type: this.storeType,
                bam: this._makeBlob( resource ),
                name: newName
            };
            return true;
        } else if( resource.type == 'bai' ) {
            var basename = Util.basename(
                resource.file ? resource.file.name :
                resource.url  ? resource.url       :
                                ''
                , '.bai'
            );
            if( !basename )
                return false;

            // go through the configs and look for BAMs that match like zee.bam -> zee.bam.bai
            for( var n in configs ) {
                var c = configs[n];
                if( Util.basename( c.bam ? c.bam.url || c.bam.blob.name : c.urlTemplate ) == basename ) {
                    // it's a match, put it in
                    c.bai = this._makeBlob( resource );
                    return true;
                }
            }
            // go through again and look for BAMs that match like zee.bam -> zee.bai
            for( var n in configs ) {
                var c = configs[n];
                if( Util.basename( c.bam ? c.bam.url || c.bam.blob.name : c.urlTemplate, '.bam' ) == basename ) {
                    // it's a match, put it in
                    c.bai = this._makeBlob( resource );
                    return true;
                }
            }

            // otherwise make a new store
            var newName = 'BAM_'+Util.basename(basename,'.bam')+'_'+uniqCounter++;
            configs[newName] = {
                bai: this._makeBlob( resource ),
                name: newName,
                type: this.storeType
            };
            return true;
        }
        else
            return false;
    },

    // try to merge any singleton BAM and BAI stores.  currently can only do this if there is one of each
    finalizeConfiguration: function( configs ) {
        var singletonBAIs = {};
        var singletonBAICount = 0;
        var singletonBAMs = {};
        var singletonBAMCount = 0;
        for( var n in configs ) {
            var conf = configs[n];
            if( (conf.bai || conf.baiUrlTemplate) && ! ( conf.bam || conf.urlTemplate ) ) {
                // singleton BAI
                singletonBAICount++;
                singletonBAIs[n] = conf;
            }
            else if(( conf.bam || conf.urlTemplate ) && ! ( conf.bai || conf.baiUrlTemplate) ) {
                // singleton BAM
                singletonBAMCount++;
                singletonBAMs[n] = conf;
            }
        }

        // if we have a single BAM and single BAI left at the end,
        // stick them together and we'll see what happens
        if( singletonBAMCount == 1 && singletonBAICount == 1 ) {
            for( var bainame in singletonBAIs ) {
                for( var bamname in singletonBAMs ) {
                    if( singletonBAIs[bainame].baiUrlTemplate )
                        singletonBAMs[bamname].baiUrlTemplate = singletonBAIs[bainame].baiUrlTemplate;
                    if( singletonBAIs[bainame].bai )
                        singletonBAMs[bamname].bai = singletonBAIs[bainame].bai;

                    delete configs[bainame];
                }
            }
        }

        // delete any remaining singleton BAIs, since they don't have
        // a hope of working
        for( var bainame in singletonBAIs ) {
            delete configs[bainame];
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
        return (conf.bam || conf.urlTemplate) && ( conf.bai || conf.baiUrlTemplate || conf.urlTemplate );
    }
};
});
