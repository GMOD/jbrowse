define(['dojo/_base/declare'], function(declare) {
    return declare(null, {

        constructor: function(){

        },

        handleQueryParams: function(config,queryParams) {
            var values, storeValue, valuesLabel ;
            var storeTracks = {};
            Object.keys(queryParams).forEach(function(queryParam){
                if(queryParam.indexOf('addStore\.')==0){
                    values = queryParam.split("\.");
                    storeValue = values[1];
                    valuesLabel = values[2];
                    if(!config.stores[storeValue]){
                        config.stores[storeValue] = {};
                    }
                    config.stores[storeValue][valuesLabel] = queryParams[queryParam];
                }
                else
                if(queryParam.indexOf('addTracks\.')==0){
                    values = queryParam.split("\.");
                    storeValue = values[1];
                    valuesLabel = values[2];

                    if(!storeTracks[storeValue]){
                        storeTracks[storeValue] = {};
                    }
                    storeTracks[storeValue][valuesLabel] = queryParams[queryParam];
                }
            });

            if(storeTracks){
                // add one for each
                for(track in storeTracks){
                    if(!config.tracks){
                        config.tracks = [] ;
                    }
                    var storeTrack = storeTracks[track];
                    storeTrack.store = track;
                    config.tracks.push(storeTrack);
                }
            }
        }
    });
});
