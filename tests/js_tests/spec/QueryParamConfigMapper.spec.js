require(['JBrowse/QueryParamConfigMapper', 'dojo/io-query'], function (
  QueryParamConfigMapper,
  ioQuery,
) {
  describe('QueryParamConfigMapper', function () {
    var mapper = QueryParamConfigMapper()
    it('should construct', () => {
      expect(mapper).toBeTruthy()
    })

    it('should interpret addStores properly', function () {
      var queryString =
        'addStores.store1.type=HMLFeatures&addStores.store1.urlTemplate=http://abc.com/test.gff'
      var config = {}
      var queryParams = ioQuery.queryToObject(queryString)
      runs(function () {
        mapper.handleQueryParams(config, queryParams)
        var answer = {
          stores: {
            store1: {
              type: 'HMLFeatures',
              urlTemplate: 'http://abc.com/test.gff',
            },
          },
        }
        expect(config.stores).toEqual(answer.stores)
      })
    })

    it('tests addBookmarks, addStores, and addTracks', function () {
      var queryString =
        'addStores.store1.type=JBrowse/Store/SeqFeature/GFF3&addStores.store1.urlTemplate=http://localhost/volvox.gff3&addTracks.store1.label=genes&addTracks.store1.type=JBrowse/View/Track/HTMLFeatures&highlight=&addBookmarks.bookmark1.start=3000&addBookmarks.bookmark1.end=4000&addBookmarks.bookmark1.ref=ctgA'
      var config = {}
      var queryParams = ioQuery.queryToObject(queryString)
      runs(function () {
        mapper.handleQueryParams(config, queryParams)
        var answer = {
          stores: {
            store1: {
              type: 'JBrowse/Store/SeqFeature/GFF3',
              urlTemplate: 'http://localhost/volvox.gff3',
            },
          },
          tracks: [
            {
              label: 'genes',
              type: 'JBrowse/View/Track/HTMLFeatures',
              store: 'store1',
            },
          ],
          bookmarks: {
            features: [{ start: '3000', end: '4000', ref: 'ctgA' }],
          },
        }
        expect(config).toEqual(answer)
      })
    })

    it('convert JSON into URL for large nested string', function () {
      var queryString = 'store1.style.view.className=bestGff3'
      var inputJson = {}
      runs(function () {
        mapper.generateJsonFromKey(inputJson, queryString, null)
        var answer = { store1: { style: { view: { className: 'bestGff3' } } } }
        expect(inputJson).toEqual(answer)
      })
    })

    it('convert JSON into URL', function () {
      var inputJson = {
        addStores: {
          stores: {
            store1: {
              type: 'HMLFeatures',
              urlTemplate: 'http://abc.com/test.gff',
            },
          },
        },
      }
      runs(function () {
        var generatedUrl = mapper.generateUrl(inputJson)
        var answer =
          'addStores.stores.store1.type=HMLFeatures&addStores.stores.store1.urlTemplate=http://abc.com/test.gff'
        expect(generatedUrl).toEqual(answer)
      })
    })

    it('test multiple nested ingest', function () {
      var queryString =
        'addStores.stores.store1.type=HMLFeatures&addStores.stores.store1.urlTemplate=http://abc.com/test.gff'
      var config = {}
      var answer = {
        addStores: {
          stores: {
            store1: {
              type: 'HMLFeatures',
              urlTemplate: 'http://abc.com/test.gff',
            },
          },
        },
      }
      runs(function () {
        mapper.generateJsonFromKey(config, queryString)
        expect(config).toEqual(answer)
      })
    })

    it('test multiple nested views', function () {
      var queryString =
        'addStores.store1.type=HMLFeatures&addStores.store1.urlTemplate=http://abc.com/test.gff'
      var config = {}
      var answer = {
        stores: {
          store1: {
            type: 'HMLFeatures',
            urlTemplate: 'http://abc.com/test.gff',
          },
        },
      }
      var queryParams = ioQuery.queryToObject(queryString)
      runs(function () {
        mapper.handleQueryParams(config, queryParams)
        expect(config).toEqual(answer)
      })
    })

    it('decode real addTracks JSON into URL', function () {
      var queryObject = {
        addTracks: {
          store1: {
            label: 'BLAST++Results',
            category: '0.+Reference+Assembly',
            type: 'WebApollo/View/Track/DraggableBLASTFeatures',
            store: 'url',
            style: {
              renderClassName: 'gray-center-30pct',
              subfeatureClasses: { match_part: 'blast-match_part' },
            },
          },
        },
      }
      runs(function () {
        var url = mapper.generateUrl(queryObject)
        var answer =
          'addTracks.store1.label=BLAST++Results&addTracks.store1.category=0.+Reference+Assembly&addTracks.store1.type=WebApollo/View/Track/DraggableBLASTFeatures&addTracks.store1.store=url&addTracks.store1.style.renderClassName=gray-center-30pct&addTracks.store1.style.subfeatureClasses.match_part=blast-match_part'
        expect(url).toEqual(answer)
      })
    })

    it('properly encode addTracks URL into JSON', function () {
      var queryString =
        'addTracks.store1.label=BLAST++Results&addTracks.store1.category=0.+Reference+Assembly&addTracks.store1.type=WebApollo/View/Track/DraggableBLASTFeatures&addTracks.store1.style.renderClassName=gray-center-30pct&addTracks.store1.style.subfeatureClasses.match_part=blast-match_part'
      var config = {}
      var queryParams = ioQuery.queryToObject(queryString)
      var answer = {
        tracks: [
          {
            store: 'store1',
            label: 'BLAST++Results',
            category: '0.+Reference+Assembly',
            type: 'WebApollo/View/Track/DraggableBLASTFeatures',
            style: {
              renderClassName: 'gray-center-30pct',
              subfeatureClasses: { match_part: 'blast-match_part' },
            },
          },
        ],
      }
      runs(function () {
        mapper.handleQueryParams(config, queryParams)
        expect(config).toEqual(answer)
      })
    })

    it('properly encode addFeatures URL into JSON', function () {
      var queryString =
        'addFeatures.1.seq_id=scf7180000394085&addFeatures.1.start=914360&addFeatures.1.end=914389&addFeatures.1.strand=1&addFeatures.1.name=HSP'
      queryString +=
        '&addFeatures.2.seq_id=scf7180000394085&addFeatures.2.start=917599&addFeatures.2.end=917628&addFeatures.2.strand=1&addFeatures.2.name=HSP'
      var config = {}
      var queryParams = ioQuery.queryToObject(queryString)

      // config.stores.url.features = JSON.parse( queryParams.addFeatures );
      var answer = {
        stores: {
          url: {
            features: [
              {
                seq_id: 'scf7180000394085',
                start: '914360',
                end: '914389',
                strand: '1',
                name: 'HSP',
              },
              {
                seq_id: 'scf7180000394085',
                start: '917599',
                end: '917628',
                strand: '1',
                name: 'HSP',
              },
            ],
          },
        },
      }
      runs(function () {
        mapper.handleQueryParams(config, queryParams)
        expect(config).toEqual(answer)
      })
    })

    it('put addTracks and addFeatures together', function () {
      var queryString =
        'addFeatures.1.seq_id=scf7180000394085&addFeatures.1.start=914360&addFeatures.1.end=914389&addFeatures.1.strand=1&addFeatures.1.name=HSP'
      queryString +=
        '&addFeatures.2.seq_id=scf7180000394085&addFeatures.2.start=917599&addFeatures.2.end=917628&addFeatures.2.strand=1&addFeatures.2.name=HSP'
      queryString +=
        '&addTracks.store1.label=BLAST++Results&addTracks.store1.category=0.+Reference+Assembly&addTracks.store1.type=WebApollo/View/Track/DraggableBLASTFeatures&addTracks.store1.style.renderClassName=gray-center-30pct&addTracks.store1.style.subfeatureClasses.match_part=blast-match_part'
      var config = {}
      var queryParams = ioQuery.queryToObject(queryString)
      var answer = {
        stores: {
          url: {
            features: [
              {
                seq_id: 'scf7180000394085',
                start: '914360',
                end: '914389',
                strand: '1',
                name: 'HSP',
              },
              {
                seq_id: 'scf7180000394085',
                start: '917599',
                end: '917628',
                strand: '1',
                name: 'HSP',
              },
            ],
          },
        },
      }
      answer.tracks = [
        {
          store: 'store1',
          label: 'BLAST++Results',
          category: '0.+Reference+Assembly',
          type: 'WebApollo/View/Track/DraggableBLASTFeatures',
          style: {
            renderClassName: 'gray-center-30pct',
            subfeatureClasses: { match_part: 'blast-match_part' },
          },
        },
      ]
      runs(function () {
        mapper.handleQueryParams(config, queryParams)
        expect(config).toEqual(answer)
      })
    })
  })
})
