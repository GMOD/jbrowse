define([
           'dojo/_base/declare',
           'dojo/_base/Deferred',
           'JBrowse/Store/SeqFeature/NCList',
           'JBrowse/Store/NCList_v0'
       ], function( declare, Deferred, SFNCList, GenericNCList ) {
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
        this.fields = {};
        this.track = new Deferred();
        if( args.track )
            this.track.resolve( args.track );
    },

    setTrack: function(t) {
        this.track.resolve( t );
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

            this.track.then( function( track ) {
                dojo.forEach(
                    ['className','arrowheadClass','subfeatureClasses','urlTemplate','clientConfig'],
                    function(varname) {
                        if( !track.config.style ) track.config.style = {};
                        var dest_varname = renameVar[varname] || varname;
                        if( varname in trackInfo )
                            track.config.style[dest_varname] = trackInfo[varname];
                    },this);

                // also need to merge Ye Olde clientConfig values into the style object
                if( track.config.style.clientConfig ) {
                    track.config.style = dojo.mixin( track.config.style, track.config.style.clientConfig );
                    delete track.config.style.clientConfig;
                }
            });

            // remember the field offsets from the old-style trackinfo headers
            this.fields = {};
            this.fieldOrder = [];
            var i;
            for (i = 0; i < trackInfo.headers.length; i++) {
                this.fieldOrder.push( trackInfo.headers[i] );
                this.fields[trackInfo.headers[i]] = i;
            }
            this.subFields = {};
            this.subFieldOrder = [];
            if (trackInfo.subfeatureHeaders) {
                for (i = 0; i < trackInfo.subfeatureHeaders.length; i++) {
                    this.subFieldOrder.push( trackInfo.subfeatureHeaders[i] );
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

    _getFeatures: function( query, origFeatCallback, finishCallback, errorCallback ) {
        var that = this,
        startBase = query.start,
        endBase = query.end,
        fields = this.fields,
        fieldOrder = this.fieldOrder,
        subFields = this.subFields,
        subfieldOrder = this.subfieldOrder,
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
        tags = function() {
            return fieldOrder;
        },
        subTags = function() {
            return subfieldOrder;
        },
        featCallBack = function( feature, path ) {
            feature.get = get;
            feature.tags = tags;
            feature._uniqueID = path.join(',');
            var subfeatCtr = 0;
            dojo.forEach( feature.get('subfeatures'), function(f) {
                              f.get = subget;
                              f.tags = subTags;
                              f._uniqueID = feature._uniqueID+'-'+(++subfeatCtr);
                          });
            return origFeatCallback( feature, path );
        };

        return this.nclist.iterate.call( this.nclist, startBase, endBase, featCallBack, finishCallback );
    }
});
});
