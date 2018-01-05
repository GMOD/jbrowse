define(['dojo/_base/declare'], function(declare) {
    return declare(null, {

        constructor: function(){

        },

        handleQueryParams: function(config,queryParams) {
            var values, storeValue, valuesLabel ;
            var storeTracks = {};
            var storeBookmarks= {};
            Object.keys(queryParams).forEach(function(queryParam){
                if(queryParam.indexOf('addStore\.')==0){
                    values = queryParam.split("\.");
                    storeValue = values[1];
                    valuesLabel = values[2];
                    if(!config.stores){
                        config.stores = {};
                    }
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
                else
                if(queryParam.indexOf('addBookmarks\.')==0){
                    values = queryParam.split("\.");
                    storeValue = values[1];
                    valuesLabel = values[2];

                    if(!storeBookmarks[storeValue]){
                        storeBookmarks[storeValue] = {};
                    }
                    storeBookmarks[storeValue][valuesLabel] = queryParams[queryParam];
                }

                // TODO: implement addFeatures?
                // http://gmod.org/wiki/JBrowse_Configuration_Guide#addFeatures
            });

            if(storeTracks){
                // add one for each
                for(var track in storeTracks){
                    if(!config.tracks){
                        config.tracks = [] ;
                    }
                    var storeTrack = storeTracks[track];
                    storeTrack.store = track;
                    config.tracks.push(storeTrack);
                }
            }

            if(storeBookmarks){
                // add one for each
                for(var bookmark in storeBookmarks){
                    if(!config.bookmarks){
                        config.bookmarks = {} ;
                    }
                    if(!config.bookmarks.features){
                        config.bookmarks.features = [] ;
                    }
                    var storeBookmark = storeBookmarks[bookmark];
                    // explicitly try to handle loc strings?
                    config.bookmarks.features.push(storeBookmark);
                }
            }
        }
    });
});
