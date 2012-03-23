var SeqFeatureStore; if( !SeqFeatureStore) SeqFeatureStore = function() {};

/**
 * Feature storage backend for backward-compatibility with JBrowse 1.2.1 stores.
 * @class
 * @extends SeqFeatureStore.NCList
 */

SeqFeatureStore.NCList_v0 = function(args) {
    SeqFeatureStore.NCList.call( this, args );

    this.fields = {};
    this.track = args.track;
};

SeqFeatureStore.NCList_v0.prototype = new SeqFeatureStore.NCList('');


/**
 * Delete an object member and return the deleted value.
 * @private
 */
SeqFeatureStore.NCList_v0.prototype._del = function( obj, old ) {
    var x = obj[old];
    delete obj[old];
    return x;
};

SeqFeatureStore.NCList_v0.prototype.loadSuccess = function( trackInfo, url ) {

    if( trackInfo ) {

        // munge the trackInfo to make the histogram stuff work with v1 code
        dojo.forEach( trackInfo.histogramMeta, function(m) {
                          m.arrayParams.urlTemplate = m.arrayParams.urlTemplate.replace(/\{chunk\}/,'{Chunk}');
                      });
        trackInfo.histograms = {
            meta: this._del( trackInfo, 'histogramMeta' ),
            stats: this._del( trackInfo, 'histStats' )
        };

        // since the old format had config information inside the
        // trackdata file, yuckily push it up to the track's config
        var renameVar = {
            urlTemplate: "linkTemplate"
        };
        dojo.forEach(
            ['className','arrowheadClass','subfeatureClasses','urlTemplate'],
            function(varname) {
                if( !this.track.config.style ) this.track.config.style = {};
                var dest_varname = renameVar[varname] || varname;
                if( varname in trackInfo )
                    this.track.config.style[dest_varname] = trackInfo[varname];
            },this);

        // remember the field offsets from the old-style trackinfo headers
        this.fields = {};
        var i;
        for (i = 0; i < trackInfo.headers.length; i++) {
            this.fields[trackInfo.headers[i]] = i;
        }
        this.subFields = {};
        if (trackInfo.subfeatureHeaders) {
            for (i = 0; i < trackInfo.subfeatureHeaders.length; i++) {
                this.subFields[trackInfo.subfeatureHeaders[i]] = i;
            }
        }

    }

    return SeqFeatureStore.NCList.prototype.loadSuccess.call( this, trackInfo, url );
};

SeqFeatureStore.NCList_v0.prototype.makeNCList = function() {
    return new NCList_v0();
};

SeqFeatureStore.NCList_v0.prototype.loadNCList = function( trackInfo, url ) {
    this.nclist.importExisting(trackInfo.featureNCList,
                                 trackInfo.sublistIndex,
                                 trackInfo.lazyIndex,
                                 url,
                                 trackInfo.lazyfeatureUrlTemplate);
};


SeqFeatureStore.NCList_v0.prototype.iterate = function( startBase, endBase, origFeatCallback, finishCallback ) {
    var that = this,
        fields = this.fields,
        subFields = this.subFields,
        get = function(fieldname) {
            var f = fields[fieldname];
            if( f >= 0 )
                return this[f];
            else
                return undefined;
        },
        subget = function(fieldname) {
            var f = subFields[fieldname];
            if( f >= 0 )
                return this[f];
            else
                return undefined;
        },
        featCallBack = function( feature, path ) {
            feature.get = get;
            dojo.forEach( feature.get('subfeatures'), function(f) {
                f.get = subget;
            });
            return origFeatCallback( feature, path );
        };

    return this.nclist.iterate.call( this.nclist, startBase, endBase, featCallBack, finishCallback );
};

