define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/io-query',
           'dojo/request',
           'JBrowse/Store/LRUCache',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Util',
           'JBrowse/Model/SimpleFeature'
       ],
       function(
           declare,
           lang,
           array,
           ioquery,
           request,
           LRUCache,
           SeqFeatureStore,
           DeferredFeaturesMixin,
           DeferredStatsMixin,
           Util,
           SimpleFeature
       ) {


return declare( SeqFeatureStore,
{

    constructor: function( args ) {

        // make sure the baseUrl has a trailing slash
        this.baseUrl = args.baseUrl || this.config.baseUrl;
        if( this.baseUrl.charAt( this.baseUrl.length-1 ) != '/' )
            this.baseUrl = this.baseUrl + '/';

    },

    _defaultConfig: function() {
        return {
            noCache: false
        };
    },

    getRegionStats: function( query, successCallback, errorCallback ) {

        if( ! this.config.region_stats ) {
            this._getRegionStats.apply( this, arguments );
            return;
        }

        var url = this._makeURL( 'stats/region', query );
        this._get( url, callback, errorCallback );
    },

    getFeatures: function( query, featureCallback, endCallback, errorCallback ) {
        var thisB = this;
        var url = this._makeURL( 'features', query );
        this._get( url,
                   dojo.hitch( this, '_makeFeatures',
                               featureCallback, endCallback, errorCallback
                             ),
                   errorCallback
                 );
    },

    clearCache: function() {
        delete this._cache;
    },

    // HELPER METHODS
    _get: function( url, callback, errorCallback ) {

        if( this.config.noCache )
            request( url, {
                         method: 'GET',
                         handleAs: 'json'
                     }).then(
                         callback,
                         this._errorHandler( errorCallback )
                     );
        else
            this._cachedGet( url, callback, errorCallback );

    },

    // get JSON from a URL, and cache the results
    _cachedGet: function( url, callback, errorCallback ) {
        var thisB = this;
        if( ! this._cache ) {
            this._cache = new LRUCache(
                {
                    name: 'REST data cache '+this.name,
                    maxSize: 25000, // cache up to about 5MB of data (assuming about 200B per feature)
                    sizeFunction: function( data ) { return data.length || 1; },
                    fillCallback: function( url, callback ) {
                        var get = request( url, { method: 'GET', handleAs: 'json' },
                                           true // work around dojo/request bug
                                         );
                        get.then(
                                function(data) {
                                    var nocacheResponse = /no-cache/.test(get.response.getHeader('Cache-Control'))
                                        || /no-cache/.test(get.response.getHeader('Pragma'));
                                    callback(data,null,{nocache: nocacheResponse});
                                },
                                thisB._errorHandler( lang.partial( callback, null ) )
                            );
                    }
                });
        }

        this._cache.get( url, function( data, error ) {
                             if( error )
                                 thisB._errorHandler(errorCallback)(error);
                             else
                                 callback( data );
                         });
    },

    _errorHandler: function( handler ) {
        handler = handler || function(e) {
            console.error( e, e.stack );
            throw e;
        };
        return dojo.hitch( this, function( error ) {
            var httpStatus = ((error||{}).response||{}).status;
            if( httpStatus >= 400 ) {
                handler( "HTTP " + httpStatus + " fetching "+error.response.url+" : "+error.response.text );
            }
            else {
                handler( error );
            }
        });
    },

    _makeURL: function( subpath, query ) {
        var url = this.baseUrl + subpath;
        if( query ) {
            query = dojo.mixin( {}, query );
            if( this.config.query )
                query = dojo.mixin( dojo.mixin( {}, this.config.query ),
                                    query
                                  );
            var ref = query.ref || (this.refSeq||{}).name;
            delete query.ref;
            url += (ref ? '/' + ref : '' ) + '?' + ioquery.objectToQuery( query );
        }
        return url;
    },

    _makeFeatures: function( featureCallback, endCallback, errorCallback, featureData ) {
        var features;
        if( featureData && ( features = featureData.features ) ) {
            for( var i = 0; i < features.length; i++ ) {
                featureCallback( this._makeFeature( features[i] ) );
            }
        }

        endCallback();
    },

    _parseInt: function( data ) {
        array.forEach(['start','end','strand'], function( field ) {
            if( field in data )
                data[field] = parseInt( data[field] );
        });
        if( 'score' in data )
            data.score = parseFloat( data.score );
        if( 'subfeatures' in data )
            for( var i=0; i<data.subfeatures.length; i++ )
                this._parseInt( data.subfeatures[i] );
    },

    _makeFeature: function( data, parent ) {
        this._parseInt( data );
        return new SimpleFeature( { data: data, parent: parent } );
    }
});
});