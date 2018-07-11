define([
           'dojo/_base/declare',
           'JBrowse/Util',
           'JBrowse/Model/FileBlob',
           'JBrowse/Model/XHRBlob'
       ],
       function( declare, Util, FileBlob, XHRBlob ) {
var uniqCounter = 0;
return declare( null, {

    tryResource: function( configs, resource ) {
        if( resource.type == this.fileExtension ) {
            var basename = Util.basename(
                resource.file ? resource.file.name :
                resource.url  ? resource.url       :
                                ''
            );
            if( !basename )
                return false;

            // go through the configs and see if there is one for an index that seems to match
            for( var n in configs ) {
                var c = configs[n];
                for(const index in this.indexTypes) {
                    if( Util.basename( c[index.indexConfKey] ? c[index.indexConfKey ].url || c[index.indexConfKey].blob.name : c[index.indexUrlConfKey], '.'+index.indexExtension ) == basename ) {
                        // it's a match, put it in
                        c[this.fileConfKey] = this._makeBlob( resource );
                        return true;
                    }
                }
            }
            // go through again and look for index files that don't have the base extension in them
            basename = Util.basename( basename, '.'+this.fileExtension );
            for( var n in configs ) {
                var c = configs[n];
                for(const index in this.indexTypes) {
                    if( Util.basename( c[index.indexConfKey] ? c[index.indexConfKey].url || c[index.indexConfKey].blob.name : c[index.indexUrlConfKey], '.'+index.indexExtension ) == basename ) {
                        // it's a match, put it in
                        c[this.fileConfKey] = this._makeBlob( resource );
                        return true;
                    }
                }

            }

            // otherwise make a new store config for it
            var newName = this.name+'_'+basename+'_'+uniqCounter++;
            configs[newName] = {
                type: this.storeType,
                name: newName,
                fileBasename: basename
            };
            configs[newName][this.fileConfKey] = this._makeBlob( resource );

            return true;
        } else {
            for(const index in this.indexTypes) {
                if( resource.type == index.indexExtension ) {
                    var basename = Util.basename(
                        resource.file ? resource.file.name :
                        resource.url  ? resource.url       :
                                        ''
                        , '.'+index.indexExtension
                    );
                    if( !basename )
                        return false;

                    // go through the configs and look for data files that match like zee.bam -> zee.bam.bai
                    for( var n in configs ) {
                        var c = configs[n];
                        if( Util.basename( c[this.fileConfKey] ? c[this.fileConfKey].url || c[this.fileConfKey].blob.name : c[this.fileUrlConfKey] ) == basename ) {
                            // it's a match, put it in
                            c[index.indexConfKey] = this._makeBlob( resource );
                            return true;
                        }
                    }
                    // go through again and look for data files that match like zee.bam -> zee.bai
                    for( var n in configs ) {
                        var c = configs[n];
                        if( Util.basename( c[this.fileConfKey] ? c[this.fileConfKey].url || c[this.fileConfKey].blob.name : c[this.fileUrlConfKey], '.'+this.fileExtension ) == basename ) {
                            // it's a match, put it in
                            c[index.indexConfKey] = this._makeBlob( resource );
                            return true;
                        }
                    }

                    // otherwise make a new store
                    var newName = this.name+'_'+Util.basename(basename,'.'+this.fileExtension)+'_'+uniqCounter++;
                    configs[newName] = {
                        name: newName,
                        type: this.storeType
                    };

                    configs[newName][index.indexConfKey] = this._makeBlob( resource );
                    return true;
                }
            }
        }
        return false;
    },

    // try to merge any singleton file and index stores.  currently can only do this if there is one of each
    finalizeConfiguration: function( configs ) {

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
        var valid = false;
        for(var i in this.indexTypes) {
            valid |= (conf[this.fileConfKey] || conf[this.fileUrlConfKey]) && ( conf[index.indexConfKey] || conf[index.indexUrlConfKey] || conf[this.fileUrlConfKey] );
        }
        return valid;
    }
});
});
