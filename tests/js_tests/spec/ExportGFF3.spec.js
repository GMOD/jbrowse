require(['JBrowse/View/Export/GFF3'], function (ExportGFF3) {
  describe('GFF3 Exporter', function () {
    var e = new ExportGFF3()

    it('constructs', function () {
      expect(e).toBeTruthy()
    })
  })
})
