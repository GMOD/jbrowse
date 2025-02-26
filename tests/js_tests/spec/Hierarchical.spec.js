require([
  'dojo/aspect',
  'dojo/_base/declare',
  'JBrowse/Browser',
  'JBrowse/View/TrackList/Hierarchical',
], function (aspect, declare, Browser, Hierarchical) {
  describe('Hierarchical.sort', function () {
    var browser = new Browser({ unitTestMode: true })
    browser.container = document.createElement('div')
    var tracklist = new Hierarchical({ browser })

    it('performs a custom sort', function () {
      var tracks = [
        {
          category: 't1',
        },
        {
          category: 't2',
        },
        {
          category: 't3',
        },
      ]
      tracks = tracklist.induceCategoryOrder(tracks, 't1,t2,t3')

      expect(tracks).toEqual([
        {
          category: 't1',
        },
        {
          category: 't2',
        },
        {
          category: 't3',
        },
      ])
    })
    it('sorted explicitly', function () {
      var tracks = [
        {
          category: 't1',
        },
        {
          category: 't2',
        },
        {
          category: 't3',
        },
      ]
      tracks = tracklist.induceCategoryOrder(tracks, 't3,t2,t1')

      expect(tracks).toEqual([
        {
          category: 't3',
        },
        {
          category: 't2',
        },
        {
          category: 't1',
        },
      ])
    })
    it('partial sort', function () {
      var tracks = [
        {
          category: 't1',
        },
        {
          category: 't2',
        },
        {
          category: 't3',
        },
      ]
      tracks = tracklist.induceCategoryOrder(tracks, 't3')

      expect(tracks).toEqual([
        {
          category: 't3',
        },
        {
          category: 't1',
        },
        {
          category: 't2',
        },
      ])
    })

    it('subcategory', function () {
      var tracks = [
        {
          category: 't1/s1',
        },
        {
          category: 't2',
        },
        {
          category: 't3/s3',
        },
      ]
      tracks = tracklist.induceCategoryOrder(tracks, 't3/s3,t2,t1 / s1')

      expect(tracks).toEqual([
        {
          category: 't3/s3',
        },
        {
          category: 't2',
        },
        {
          category: 't1/s1',
        },
      ])
    })
  })
})
