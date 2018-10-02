require([
            'JBrowse/Browser',
            'JBrowse/Store/SeqFeature/VCFTabix',
            'JBrowse/Model/XHRBlob'
        ],
        function(
            Browser,
            VCFStore,
            XHRBlob
        ) {
describe('VCF store', function() {



  xit('reads big dbsnp', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../../../data/big_vcf/00-All.vcf.gz',
                 baseUrl: '.'
             },
             refSeq: { name: 'chr10', start: 0, end: 135534747 }
         });

         var features = [];
         waitsFor( function() { return features.done; } );
         store.getFeatures({ ref: 'chr10',
                             start: 33870887,
                             end: 33896487
                           },
                           function(f) { features.push( f ); },
                           function( ) { features.done = true; },
                           function(e) { console.error(e.stack||''+e); }
                          );
         runs(function() {
                  expect(features.length).toEqual( 560 );
         });
  });




  it('reads gvcf * alleles', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../../docs/tutorial/data_files/gvcf.vcf.gz',
                 baseUrl: '.'
             },
             refSeq: { name: 'ctgA', start: 0, end: 5000 }
         });

         var features = [];
         waitsFor( function() { return features.done; } );
         store.getFeatures({ ref: 'ctgA',
                             start: 0,
                             end: 5000
                           },
                           function(f) { features.push( f ); },
                           function( ) { features.done = true; },
                           function(e) { console.error(e.stack||''+e); }
                          );
         runs(function() {
                  expect(features.length).toEqual( 7 );
                  expect(features[2].get('alternative_alleles').values).toEqual("TC,<*>");
         });



  });

  it('no newline in VCF genotypes', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../../docs/tutorial/data_files/volvox.test.vcf.gz',
                 baseUrl: '.'
             },
             refSeq: { name: 'ctgA', start: 0, end: 50000 }

         });

         var features = [];
         waitsFor( function() { return features.done; } );
         store.getFeatures({ ref: 'ctgA',
                             start: 0,
                             end: 7000
                           },
                           function(f) { features.push( f ); },
                           function( ) { features.done = true; },
                           function(e) { console.error(e.stack||''+e); }
                          );
         runs(function() {
                  var gt = features[0].get('genotypes');
                  var names = Object.keys(gt);
                  var last = names[names.length-1];
                  expect(last.match("\n")).toEqual(null);
         });

  });

  it('reads gatk non_ref alleles', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../data/raw.g.vcf.gz',
                 baseUrl: '.'
             },
             refSeq: { name: 'ctgA', start: 0, end: 5000 }
         });


         var features = [];
         waitsFor( function() { return features.done; } );
         store.getFeatures({ ref: 'ctgA',
                             start: 0,
                             end: 100
                           },
                           function(f) { features.push( f ); },
                           function( ) { features.done = true; },
                           function(e) { console.error(e.stack||''+e); }
                          );
         runs(function() {
                  expect(features.length).toEqual( 37 );
                  expect(features[0].get('alternative_alleles').values).toEqual('<NON_REF>');
         });
  });




  it('parses END field', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../data/vcf.end.gz',
                 baseUrl: '.'
             },
             refSeq: { name: '1', start: 0, end: 50000 }
         });

         var features = [];
         waitsFor( function() { return features.done; } );
         store.getFeatures({ ref: '1',
                             start: 0,
                             end: 5000
                           },
                           function(f) { features.push( f ); },
                           function( ) { features.done = true; },
                           function(e) { console.error(e.stack||''+e); }
                          );
         runs(function() {
                  expect(features[0].get('end')).toEqual(4388);
                  expect(features[1].get('end')).toEqual(4600);
                  expect(features.length).toEqual( 2 );
         });

  });



  it('reads a CSI index', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../data/fake_large_chromosome/test.vcf.gz',
                 csiUrlTemplate: '../data/fake_large_chromosome/test.vcf.gz.csi',
                 baseUrl: '.'
             },
             refSeq: { name: '1', start:1206808844, end: 1206851071 }
         });

         var features = [];
         waitsFor( function() { return features.done; } );
         store.getFeatures({ ref: '1',
                             start: 1206810422,
                             end: 1206849288
                           },
                           function(f) { features.push( f ); },
                           function( ) { features.done = true; },
                           function(e) { console.error(e.stack||''+e); }
                          );
         runs(function() {
                  features.forEach(feature => {
                      expect(feature.get('end')).toBeGreaterThan(1206808843)
                      expect(feature.get('start')).toBeLessThan(12068510711)
                      expect(feature.get('seq_id')).toEqual('1')
                  })
                  expect(features.length).toEqual( 37 );
                  expect(features[0].fields).toEqual([
                      "1",
                      "1206810423",
                      null,
                      "T",
                      "A",
                      "25",
                      null,
                      "DP=19;VDB=0.0404;AF1=0.5;AC1=1;DP4=3,7,3,6;MQ=37;FQ=28;PV4=1,1,1,0.27",
                      "GT:PL:GQ",
                      "0/1:55,0,73:58"
                  ])
         });
  });

  it('reads VCF tabix with dummy', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../../docs/tutorial/data_files/volvox.filtered.vcf.gz',
                 tbiUrlTemplate: '../data/volvox.filtered.vcf.gz.tbi.has_dummy',
                 baseUrl: '.'
             },
             refSeq: { name: 'ctgA', start:0, end: 50000 }
         });

         var stats = {};
         waitsFor( function() { return stats.done; } );
         store.indexedData.featureCount('whatever').then(()=> {
             store._estimateGlobalStats({ name: 'ctgA',
                            start: 0,
                            end:50000
                        }).then(function(f) {
                            stats = f;
                            stats.done = true;
                        });

         })
         runs(function() {
             expect(stats.featureDensity).toBeCloseTo( 0.0009 );
         });
  });

  it('reads VCF tabix without dummy', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../../docs/tutorial/data_files/volvox.filtered.vcf.gz',
                 tbiUrlTemplate: '../data/volvox.filtered.vcf.gz.tbi.no_dummy',
                 baseUrl: '.'
             },
             refSeq: { name: 'ctgA', start:0, end: 50000 }
         });

         var stats = {};
         waitsFor( function() { return stats.done; } );

         store._estimateGlobalStats({ name: 'ctgA',
                        start: 0,
                        end:50000
                    }).then(function(f) {
                        stats = f;
                        stats.done = true;
                    });

    runs(function() {
            expect(stats.featureDensity).toBeCloseTo( 0.0009 );
         });
  });

  it('large VCF header fetches whole header', function() {
    var store = new VCFStore({
        browser: new Browser({unitTestMode: true}),
        config: {
            urlTemplate: '../data/large_vcf_header/large_vcf_header.vcf.gz',
            baseUrl: '.'
        },
        refSeq: { name: 'LcChr1', start:0, end:1000 },
    })

    var parsedHeader
    waitsFor(() => parsedHeader)
    store.getVCFHeader().then( h => { parsedHeader = h })
    runs(function() {
        expect(parsedHeader.bcftools_callcommand[0]).toEqual("call -A -m -v 350_LcChr1.bcf")
    });
});

it('large VCF header fetches features', function() {
    var store = new VCFStore({
        browser: new Browser({unitTestMode: true}),
        config: {
            urlTemplate: '../data/large_vcf_header/large_vcf_header.vcf.gz',
            baseUrl: '.'
        },
        refSeq: { name: 'LcChr1', start:0, end:1000 }
    });

    var features = [];
    waitsFor( function() { return features.done; } );
    store.getFeatures({ ref: 'LcChr1',
                        start: 1,
                        end: 10000
                      },
                      function(f) { features.push( f ); },
                      function( ) { features.done = true; },
                      function(e) { console.error(e.stack||''+e); }
                     );
    runs(function() {
        var a = features[0].get('genotypes');
        expect(Object.keys(a).length).toBeTruthy(); // expect non empty object
    });
});

});
});
