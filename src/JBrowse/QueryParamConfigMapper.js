define(['dojo/_base/declare', 'JBrowse/Util/dot-object'], function (declare, dotObject) {
    return declare(null, {

        constructor: function () {

        },

        generateUrl: function (input) {
            var returnObject = dotObject.dot(input);
            var returnString;
            Object.keys(returnObject).forEach(function (key) {
                var stringEntry = key + '=' + returnObject[key];
                if (!returnString) {
                    returnString = stringEntry;
                }
                else {
                    returnString += '&' + stringEntry;
                }
            });

            return returnString;
        },

        generateJsonFromKeyArray: function (inputJson, keyArray, keyDepth, value) {
            if (!keyArray || keyArray.length == keyDepth) return;

            var firstKey = keyArray[keyDepth - 1];
            // set value if the last one
            if (keyArray.length == keyDepth - 1) {
                inputJson[firstKey] = value;
                return;
            }

            // more keys available, so if nothing is set, just set to null
            if (!inputJson.hasOwnProperty(firstKey)) {
                inputJson[firstKey] = {};
            }
            this.generateJsonFromKeyArray(inputJson[firstKey], keyArray, ++keyDepth, value);

        },

        mapParam: function (inputJson, queryParam) {
            var inputQA = queryParam.split("=");
            var query = inputQA[0];
            var value = inputQA[1];
            dotObject.str(query, value, inputJson)
        },

        generateJsonFromKey: function (inputJson, keyString) {
            var allParams = keyString.split("\&");
            var mapParamB = this.mapParam ;
            allParams.forEach(function (queryParam) {
                mapParamB(inputJson, queryParam);
            });
        },

        handleQueryParams: function (config, queryParams) {
            var values, storeValue, valuesLabel;
            var storeTracks = {};
            var storeBookmarks = {};
            var mapParamB = this.mapParam;
            Object.keys(queryParams).forEach(function (queryParam) {
                if (queryParam.indexOf('addStore\.') == 0) {
                    // mapParamB(config,queryParam)

                    values = queryParam.split("\.");
                    storeValue = values[1];
                    valuesLabel = values[2];
                    if (!config.stores) {
                        config.stores = {};
                    }
                    if (!config.stores[storeValue]) {
                        config.stores[storeValue] = {};
                    }
                    config.stores[storeValue][valuesLabel] = queryParams[queryParam];
                }
                else if (queryParam.indexOf('addTracks\.') == 0) {

                    var queryNameArray = queryParam.split("\.");
                    var storeName = queryNameArray[1];
                    var storeTrack = storeTracks[storeName] ? storeTracks[storeName] : {};
                    var propertyName = queryNameArray.slice(2).join('.');
                    dotObject.str('store',storeName,storeTrack);
                    dotObject.str(propertyName,queryParams[queryParam],storeTrack);
                    dotObject.str(storeName,storeTrack,storeTracks)
                }
                else if (queryParam.indexOf('addBookmarks\.') == 0) {
                    values = queryParam.split("\.");
                    storeValue = values[1];
                    valuesLabel = values[2];

                    if (!storeBookmarks[storeValue]) {
                        storeBookmarks[storeValue] = {};
                    }
                    storeBookmarks[storeValue][valuesLabel] = queryParams[queryParam];
                }

                // TODO: implement addFeatures?
                // http://gmod.org/wiki/JBrowse_Configuration_Guide#addFeatures
            });


            // move tracks if it exists:

            // dotObject.move('addStore','stores',config);
            // dotObject.move('addBookmarks','bookmarks.features',config);

            // convert to an array
            if (storeTracks) {
                console.log(JSON.stringify(storeTracks));
                // add one for each
                for (var track in storeTracks) {
                    if (!config.tracks) {
                        config.tracks = [];
                    }
                    var storeTrack = storeTracks[track];
                    // storeTrack.store = track;
                    config.tracks.push(storeTrack);
                }
            }

            if (storeBookmarks) {
                // add one for each
                for (var bookmark in storeBookmarks) {
                    if (!config.bookmarks) {
                        config.bookmarks = {};
                    }
                    if (!config.bookmarks.features) {
                        config.bookmarks.features = [];
                    }
                    var storeBookmark = storeBookmarks[bookmark];
                    // explicitly try to handle loc strings?
                    config.bookmarks.features.push(storeBookmark);
                }
            }
        }
    });
});
