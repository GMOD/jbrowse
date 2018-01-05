define(['dojo/_base/declare'], function (declare) {
    return declare(null, {

        constructor: function () {

        },

        generateUrl: function (input, keyPrefixes, returnString) {
            // for each key, you need to recurse a level
            returnString = returnString ? returnString : '';
            keyPrefixes = keyPrefixes ? keyPrefixes : [];
            Object.keys(input).forEach(function (key) {
                var value = input[key];
                if (typeof value == 'object') {
                    returnString += this.generateUrl(value, keyPrefixes, returnString)
                }
                else {
                    returnString += '&' + keyPrefixes.join(".") + "." + key + '=' + value;
                }
            });
            return returnString.slice(1);
        },

        generateJsonFromKeyArray: function (inputJson, keyArray, keyDepth, value) {
            if (!keyArray || keyArray.length==keyDepth ) return;

            var firstKey = keyArray[keyDepth-1];
            // set value if the last one
            if (keyArray.length == keyDepth-1) {
                inputJson[firstKey] = value;
                return ;
            }

            // more keys available, so if nothing is set, just set to null
            if (!inputJson.hasOwnProperty(firstKey)) {
                inputJson[firstKey] = {} ;
                // nextJson = inputJson[firstKey];
            }
            // inputJson[firstKey] = nextJson;

            this.generateJsonFromKeyArray(inputJson[firstKey], keyArray,++keyDepth, value);

        },

        generateJsonFromKey: function (inputJson, keyString) {
            var inputQA = keyString.split("=");
            var keys = inputQA[0].split(".");
            var value = inputQA[1];
            // inputJson.split('.').reduce((o,i)=>o[i], obj)
            // split('.').reduce(index, obj);
            console.log(JSON.stringify(keys));
            console.log(value);

            this.generateJsonFromKeyArray(inputJson, keys, 0,value);
            // return inputJson;
        },

        handleQueryParams: function (config, queryParams) {
            var values, storeValue, valuesLabel;
            var storeTracks = {};
            var storeBookmarks = {};
            Object.keys(queryParams).forEach(function (queryParam) {
                if (queryParam.indexOf('addStore\.') == 0) {
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
                    values = queryParam.split("\.");
                    storeValue = values[1];
                    valuesLabel = values[2];

                    if (!storeTracks[storeValue]) {
                        storeTracks[storeValue] = {};
                    }
                    storeTracks[storeValue][valuesLabel] = queryParams[queryParam];
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

            if (storeTracks) {
                // add one for each
                for (var track in storeTracks) {
                    if (!config.tracks) {
                        config.tracks = [];
                    }
                    var storeTrack = storeTracks[track];
                    storeTrack.store = track;
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
