require(['JBrowse/Store/Hash'], function (HashStore) {
  describe('Hash with test data', function () {
    var hashstore = new HashStore({
      url: '../data/volvox_formatted_names/names',
    })

    it('should have reference sequences stored', function () {
      var result
      hashstore.query({ name: 'ctgb' }).then(feat => {
        result = feat
      })
      waitsFor(function () {
        return result
      })
      runs(() => {
        expect(result.length > 0).toBeTruthy()
      })
    })

    it('should not find missing data', function () {
      var result
      hashstore.query({ name: 'ctgc' }).then(feat => {
        result = feat
      })
      waitsFor(function () {
        return result
      })
      runs(() => {
        expect(result.length == 0).toBeTruthy()
      })
    })

    it('should have eden', function () {
      var result
      hashstore.query({ name: 'eden' }).then(feat => {
        result = feat
      })
      waitsFor(function () {
        return result
      })
      runs(() => {
        expect(result.length == 2).toBeTruthy()
      })
    })
  })
})
