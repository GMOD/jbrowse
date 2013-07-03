define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/io-query',
           'dojo/request/xhr',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Util',
           'JBrowse/Model/SimpleFeature'
       ],
       function(
           declare,
           array,
           ioquery,
           xhr,
           SeqFeatureStore,
           DeferredFeaturesMixin,
           DeferredStatsMixin,
           Util,
           SimpleFeature
       ) {

return declare( SeqFeatureStore,
{

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


    // HELPER METHODS


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
        var url = this.config.baseUrl + subpath;
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

    _makeFeature: function( data, parent ) {
        array.forEach(['start','end','strand'], function( field ) {
            if( field in data )
                data[field] = parseInt( data[field] );
        });
        if( 'score' in data )
            data.score = parseFloat( data.score );
        return new SimpleFeature( { data: data, parent: parent } );
    }
});
});