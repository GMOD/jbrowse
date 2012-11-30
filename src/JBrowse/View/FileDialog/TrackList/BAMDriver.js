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
                if( Util.basename( c.bai ? c.bai.blob.name : c.baiUrlTemplate, '.bai' ) == basename ) {
                    // it's a match, put it in
                    c.bam = this._makeBlob( resource );
                    return true;
                }
            }
            // go through again and look for BAIs that don't have .bam on them
            basename = Util.basename( basename, '.bam' );
            for( var n in configs ) {
                var c = configs[n];
                if( Util.basename( c.bai ? c.bai.blob.name : c.baiUrlTemplate, '.bai' ) == basename ) {
                    // it's a match, put it in
                    c.bam = this._makeBlob( resource );
                    return true;
                }
            }

            // otherwise make a new store config for it
            var newName = 'bam_'+uniqCounter++;
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
                if( Util.basename( c.bam ? c.bam.blob.name : c.urlTemplate ) == basename ) {
                    // it's a match, put it in
                    c.bai = this._makeBlob( resource );
                    return true;
                }
            }
            // go through again and look for BAMs that match like zee.bam -> zee.bai
            for( var n in configs ) {
                var c = configs[n];
                if( Util.basename( c.bam ? c.bam.blob.name : c.urlTemplate, '.bam' ) == basename ) {
                    // it's a match, put it in
                    c.bai = this._makeBlob( resource );
                    return true;
                }
            }

            // otherwise make a new store
            var newName = 'bam_'+uniqCounter++;
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
