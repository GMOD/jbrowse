define([
           'dojo/_base/declare',
           'dojo/io-query',
           'dojo/request/xhr',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Util'
       ],
       function(
           declare,
           ioquery,
           xhr,
           SeqFeatureStore,
           DeferredFeaturesMixin,
           DeferredStatsMixin,
           Util
       ) {

return declare( SeqFeatureStore,
{

    getGlobalStats: function( callback, errorCallback ) {
        var url = this._makeURL( 'stats/global' );
        xhr.get( url, {
             handleAs: 'json'
        }).then(
            callback,
            this._errorHandler( errorCallback )
        );
    },

    getRegionStats: function( query, successCallback, errorCallback ) {

        if( ! this.config.region_stats ) {
            this._getRegionStats.apply( this, arguments );
            return;
        }

        var url = this._makeURL( 'stats/region', query );
        xhr.get( url, {
             handleAs: 'json'
        }).then(
            successCallback,
            this._errorHandler( errorCallback )
        );

    },

    getFeatures: function( query, featureCallback, endCallback, errorCallback ) {
        var thisB = this;
        var url = this._makeURL( 'features', query );
        errorCallback = this._errorHandler( errorCallback );
        xhr.get( url, {
             handleAs: 'json'
        }).then(
            dojo.hitch( this, '_makeFeatures', featureCallback, endCallback, errorCallback ),
            errorCallback
        );
    },

    _errorHandler: function( handler ) {
        handler = handler || function(e) {
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
        var url = this.config.baseUrl + subpath;
        if( query )
            url += '?' + ioquery.objectToQuery( query );
        return url;
    },

    _makeFeatures: function( featureCallback, endCallback, errorCallback, featureData ) {
        if( featureData ) {
            for( var i = 0; i < featureData.length; i++ ) {
                featureCallback( this._makeFeature( featureData[i] ) );
            }
        }

        endCallback();
    },

    _makeFeature: function( data, parent ) {
        return new SimpleFeature( { data: featureData[i], parent: parent } );
    }
});
});