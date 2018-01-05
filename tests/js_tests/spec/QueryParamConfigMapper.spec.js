require(['JBrowse/QueryParamConfigMapper', 'dojo/io-query', 'dojo/json'], function (QueryParamConfigMapper, ioQuery, json) {

    describe("QueryParamConfigMapper", function () {
        it("should interpret addStore properly", function () {
            var mapper = QueryParamConfigMapper();
            expect(mapper).toBeTruthy();
            var queryString = 'addStore.store1.type=HMLFeatures&addStore.store1.urlTemplate=http://abc.com/test.gff';
            var config = {};
            var queryParams = ioQuery.queryToObject(queryString);
            runs(function () {
                mapper.handleQueryParams(config, queryParams);
                var answer = {"stores": {"store1": {"type": "HMLFeatures", "urlTemplate": "http://abc.com/test.gff"}}};
                expect(config.stores).toEqual(answer.stores);
            })
        });

        it("tests bookmarks, addStore, and addTracks", function () {
            var mapper = QueryParamConfigMapper();
            expect(mapper).toBeTruthy();
            var queryString = 'addStore.store1.type=JBrowse/Store/SeqFeature/GFF3&addStore.store1.urlTemplate=http://localhost/volvox.gff3&addTracks.store1.label=genes&addTracks.store1.type=JBrowse/View/Track/HTMLFeatures&highlight=&addBookmarks.bookmark1.start=3000&addBookmarks.bookmark1.end=4000&addBookmarks.bookmark1.ref=ctgA';
            var config = {};
            var queryParams = ioQuery.queryToObject(queryString);
            runs(function () {
                mapper.handleQueryParams(config, queryParams);
                var answer = {
                    "stores": {
                        "store1": {
                            "type": "JBrowse/Store/SeqFeature/GFF3",
                            "urlTemplate": "http://localhost/volvox.gff3"
                        }
                    },
                    "tracks": [{"label": "genes", "type": "JBrowse/View/Track/HTMLFeatures", "store": "store1"}],
                    "bookmarks": {"features": [{"start": "3000", "end": "4000", "ref": "ctgA"}]}
                };
                expect(config).toEqual(answer);
            })
        });

        it("convert JSON into URL for large nested string", function () {
            var mapper = QueryParamConfigMapper();
            expect(mapper).toBeTruthy();
            var queryString = 'store1.style.view.className=bestGff3';
            var inputJson = {};
            runs(function () {
                mapper.generateJsonFromKey(inputJson, queryString,null);
                var answer = {"store1": {"style": {"view": {"className": "bestGff3"}}}};
                expect(inputJson).toEqual(answer);
            })
        });

        it("convert JSON into URL for large nested string and multiple keys", function () {
            var mapper = QueryParamConfigMapper();
            expect(mapper).toBeTruthy();
            // var queryString = 'store1.style.view.className=bestGff3&store1.style.better=bestView';
            // var inputJson = {};
            // runs(function () {
            //     mapper.generateJsonFromKey(inputJson, queryString,null);
            //     // var answer = {"store1": {"style": {"view": {"className": "bestGff3"}}}};
            //     // expect(inputJson).toEqual(answer);
            // })
        });

        it("convert JSON into URL", function () {
            var mapper = QueryParamConfigMapper();
            expect(mapper).toBeTruthy();
            var inputJson = {"stores": {"store1": {"type": "HMLFeatures", "urlTemplate": "http://abc.com/test.gff"}}};
            var config = {};
            // var queryParams = ioQuery.queryToObject(queryString);
            runs(function () {
                // var generatedUrl = mapper.generateUrl(inputJson);
                // var answer = 'addStore.store1.type=HMLFeatures&addStore.store1.urlTemplate=http://abc.com/test.gff';
                // expect(generatedUrl).toEqual(answer);
            })
        });


        it("test nested ingest", function () {
            var mapper = QueryParamConfigMapper();
            expect(mapper).toBeTruthy();
            var queryString = 'addTracks.store1.style.view.className=bestGff3';
            var config = {};
            var queryParams = ioQuery.queryToObject(queryString);
            runs(function () {
                // mapper.handleQueryParams(config, queryParams);
                // var answer = {"tracks": [{"style": {"view": {"className": "bestGff3"}}, "store": "store1"}]};
                // expect(config).toEqual(answer);
            })
        });

    });
});