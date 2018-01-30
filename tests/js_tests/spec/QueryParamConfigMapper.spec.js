require(['JBrowse/QueryParamConfigMapper', 'dojo/io-query'], function (QueryParamConfigMapper, ioQuery) {

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
                mapper.generateJsonFromKey(inputJson, queryString, null);
                var answer = {"store1": {"style": {"view": {"className": "bestGff3"}}}};
                expect(inputJson).toEqual(answer);
            })
        });


        it("convert JSON into URL", function () {
            var mapper = QueryParamConfigMapper();
            expect(mapper).toBeTruthy();
            var inputJson = {
                'addStore': {
                    'stores': {
                        'store1': {
                            'type': 'HMLFeatures',
                            'urlTemplate': 'http://abc.com/test.gff'
                        }
                    }
                }
            };
            runs(function () {
                var generatedUrl = mapper.generateUrl(inputJson);
                var answer = 'addStore.stores.store1.type=HMLFeatures&addStore.stores.store1.urlTemplate=http://abc.com/test.gff';
                expect(generatedUrl).toEqual(answer);
            })
        });


        it("test multiple nested ingest", function () {
            var mapper = QueryParamConfigMapper();
            expect(mapper).toBeTruthy();
            var queryString = 'addStore.stores.store1.type=HMLFeatures&addStore.stores.store1.urlTemplate=http://abc.com/test.gff';
            var config = {};
            var answer = {
                'addStore': {
                    'stores': {
                        'store1': {
                            'type': 'HMLFeatures',
                            'urlTemplate': 'http://abc.com/test.gff'
                        }
                    }
                }
            };
            runs(function () {
                mapper.generateJsonFromKey(config,queryString);
                expect(config).toEqual(answer);
            })
        });

        it("test multiple nested views", function () {
            var mapper = QueryParamConfigMapper();
            expect(mapper).toBeTruthy();
            var queryString = 'addStore.store1.type=HMLFeatures&addStore.store1.urlTemplate=http://abc.com/test.gff';
            var config = {};
            var answer = {
                'stores': {
                    'store1': {
                        'type': 'HMLFeatures',
                        'urlTemplate': 'http://abc.com/test.gff'
                    }
                }
            };
            var queryParams = ioQuery.queryToObject(queryString);
            runs(function () {
                mapper.handleQueryParams(config, queryParams);
                expect(config).toEqual(answer);
            })
        });

        it("decode real addTracks JSON into URL", function () {
            var mapper = QueryParamConfigMapper();
            expect(mapper).toBeTruthy();
            var queryObject = {"addTracks":{"store1":{"label":"BLAST++Results","category":"0.+Reference+Assembly","type":"WebApollo/View/Track/DraggableBLASTFeatures","store":"url","style":{"renderClassName":"gray-center-30pct","subfeatureClasses":{"match_part":"blast-match_part"}}}}};
            runs(function () {
                var url = mapper.generateUrl(queryObject);
                var answer = 'addTracks.store1.label=BLAST++Results&addTracks.store1.category=0.+Reference+Assembly&addTracks.store1.type=WebApollo/View/Track/DraggableBLASTFeatures&addTracks.store1.store=url&addTracks.store1.style.renderClassName=gray-center-30pct&addTracks.store1.style.subfeatureClasses.match_part=blast-match_part';
                expect(url).toEqual(answer);
            })
        });

        it("properly encode addTracks URL into JSON", function () {
            var mapper = QueryParamConfigMapper();
            expect(mapper).toBeTruthy();
            var queryString = 'addTracks.store1.label=BLAST++Results&addTracks.store1.category=0.+Reference+Assembly&addTracks.store1.type=WebApollo/View/Track/DraggableBLASTFeatures&addTracks.store1.style.renderClassName=gray-center-30pct&addTracks.store1.style.subfeatureClasses.match_part=blast-match_part';
            var config = {};
            var queryParams = ioQuery.queryToObject(queryString);
            var answer = {"tracks":[{"store":"store1","label":"BLAST++Results","category":"0.+Reference+Assembly","type":"WebApollo/View/Track/DraggableBLASTFeatures","style":{"renderClassName":"gray-center-30pct","subfeatureClasses":{"match_part":"blast-match_part"}}}]};
            runs(function () {
                mapper.handleQueryParams(config,queryParams);
                expect(config).toEqual(answer);
            })
        });

    });
});