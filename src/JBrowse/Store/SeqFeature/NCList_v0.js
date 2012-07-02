define([
           'dojo/_base/declare',
           'JBrowse/Store/SeqFeature/NCList',
           'JBrowse/Store/NCList_v0'
       ], function( declare, SFNCList, GenericNCList ) {
return declare( SFNCList,

/**
 * @lends JBrowse.Store.SeqFeature.NCList_v0
 */
{

    /**
     * Feature storage backend for backward-compatibility with JBrowse 1.2.1 stores.
     * @extends SeqFeatureStore.NCList
     * @constructs
     */
    constructor: function(args) {
        SFNCList.call( this, args );

        this.fields = {};
        this.track = args.track;
    },

    setTrack: function(t) {
        this.track = t;
    },

    /**
     * Delete an object member and return the deleted value.
     * @private
     */
    _del: function( obj, old ) {
        var x = obj[old];
        delete obj[old];
        return x;
    },

    loadSuccess: function( trackInfo, url ) {

        if( trackInfo ) {

            // munge the trackInfo to make the histogram stuff work with v1 code
            dojo.forEach( trackInfo.histogramMeta, function(m) {
                              m.arrayParams.urlTemplate = m.arrayParams.urlTemplate.replace(/\{chunk\}/,'{Chunk}');
                          });
            trackInfo.histograms = {
                meta: this._del( trackInfo, 'histogramMeta' ),
                stats: this._del( trackInfo, 'histStats' )
            };
            // rename stats.bases to stats.basesPerBin
            dojo.forEach( trackInfo.histograms.stats, function(s) {
                              s.basesPerBin = this._del( s, 'bases' );
                          },this);

            // since the old format had style information inside the
            // trackdata file, yuckily push it up to the track's config.style
            var renameVar = {
                urlTemplate: "linkTemplate"
            };
            dojo.forEach(
                ['className','arrowheadClass','subfeatureClasses','urlTemplate','clientConfig'],
                function(varname) {
                    if( !this.track.config.style ) this.track.config.style = {};
                    var dest_varname = renameVar[varname] || varname;
                    if( varname in trackInfo )
                        this.track.config.style[dest_varname] = trackInfo[varname];
                },this);

            // also need to merge Ye Olde clientConfig values into the style object
            if( this.track.config.style.clientConfig ) {
                this.track.config.style = dojo.mixin( this.track.config.style, this.track.config.style.clientConfig );
                delete this.track.config.style.clientConfig;
            }

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

        return SFNCList.prototype.loadSuccess.call( this, trackInfo, url );
    },

    makeNCList: function() {
        return new GenericNCList();
    },

    loadNCList: function( trackInfo, url ) {
        this.nclist.importExisting(trackInfo.featureNCList,
                                   trackInfo.sublistIndex,
                                   trackInfo.lazyIndex,
                                   url,
                                   trackInfo.lazyfeatureUrlTemplate);
    },

    iterate: function( startBase, endBase, origFeatCallback, finishCallback ) {
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
    }
});
});
