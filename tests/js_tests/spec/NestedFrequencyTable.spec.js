require(['JBrowse/Model/NestedFrequencyTable'], function (
  NestedFrequencyTable,
) {
  describe('nested frequency table', function () {
    it('works when empty', function () {
      var t = new NestedFrequencyTable()
      expect(t.total()).toEqual(0)
      var fe = []
      t.forEach(function (ct, name) {
        fe.push(ct)
      })
      expect(fe.length).toEqual(0)
    })

    it('increments', function () {
      var t = new NestedFrequencyTable()
      t.increment('foobar')
      expect(t.get('foobar')).toEqual(1)
      expect(t.get('rubber')).toEqual(0)
      expect(t.total()).toEqual(1)

      t.increment('noggin')
      expect(t.total()).toEqual(2)
    })

    it('can nest', function () {
      var t = new NestedFrequencyTable()
      t.increment('foobar')
      expect(t.get('foobar')).toEqual(1)

      t.getNested('foo/ziggy').increment()
      expect(t.total()).toEqual(2)

      t.getNested('foo/noggin').increment()
      expect(t.total()).toEqual(3)

      expect(t.get('foo').total()).toEqual(2)
    })
  })
})
