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

    });
});