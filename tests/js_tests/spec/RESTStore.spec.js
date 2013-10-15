require([
            'dojo/_base/lang',
            'JBrowse/Store/SeqFeature/REST'
        ], function( lang, RESTStore ) {

function testWithConfig(config) {
    var store = new RESTStore({
                      browser: {},
                      baseUrl: '../data/rest_store_test',
                      refSeq: { name: 'ctgA', start: 1, end: 500001 },
                      config: config || {}
                  });

    return function() {
              it( 'constructs', function() {
                      expect( store ).toBeTruthy();
                  });

              it( 'loads some data', function() {
                      var features = [];
                      var done;
                      store.getFeatures({ start: 0, end: 50000 },
                                 function( feature ) {
                                     features.push( feature );
                                 },
                                 function() {
                                     done = true;
                                 }
                               );
                      waitsFor( function() { return done; }, 2000 );
                      runs( function() {
                                expect(features.length).toEqual(6);
                                expect( features[0].get('start') ).toEqual( 1 );
                                expect( features[4].children().length ).toEqual( 2 );
                                expect( features[4].children()[1].children()[0].get('type') ).toEqual( 'SNV' );
                            });
                  });

              it( 'supports global stats', function() {
                      var stats;
                      var done;
                      store.getGlobalStats(
                                 function(s) {
                                     stats = s;
                                 }
                               );
                      waitsFor( function() { return stats; }, 2000 );
                      runs( function() {
                                expect( stats.featureDensity ).toEqual(20);
                            });
                  });

              it( 'emulates region stats', function() {
                      var stats;
                      var done;
                      store.getRegionStats({ start: 0, end: 50000 },
                                 function(s) {
                                     stats = s;
                                 }
                               );
                      waitsFor( function() { return stats; }, 2000 );
                      runs( function() {
                                expect( stats.featureDensity ).toEqual( 0.00012 );
                            });
                  });

             it( 'supports region stats if implemented', function() {
                     var store = new RESTStore(
                         {
                             browser: {},
                             baseUrl: '../data/rest_store_test',
                             refSeq: { name: 'ctgC', start: 1, end: 200 },
                             config: lang.mixin( { region_stats: true }, config || {} )
                         });
                      var stats;
                      var done;
                      store.getRegionStats({ start: 0, end: 50000 },
                                 function(s) {
                                     stats = s;
                                 }
                               );
                      waitsFor( function() { return stats; }, 2000 );
                      runs( function() {
                                expect( stats.featureDensity ).toEqual( 123 );
                                expect( stats.featureCount ).toEqual( 456 );
                                expect( stats.scoreMin ).toEqual( -1 );
                                expect( stats.scoreMax ).toEqual( 4 );
                            });
             });

             it( 'supports feature histograms if implemented', function() {
                     expect( store.getRegionFeatureDensities ).toBeFalsy();

                     var withHist = new RESTStore(
                         {
                             browser: {},
                             baseUrl: '../data/rest_store_test',
                             refSeq: { name: 'ctgA', start: 1, end: 200 },
                             config: lang.mixin( { region_feature_densities: true }, config || {} )
                         });


                      var hist;
                      var done;
                      withHist.getRegionFeatureDensities({ start: 0, end: 50000 },
                                 function(s) {
                                     hist = s;
                                 }
                               );
                      waitsFor( function() { return hist; }, 2000 );
                      runs( function() {
                                expect( hist.bins.length ).toEqual( 25 );
                                expect( hist.stats.basesPerBin ).toEqual( 200 );
                                expect( hist.stats.mean ).toEqual( 57.772 );
                            });
             });
    };
};

describe( 'REST store', testWithConfig({ foo: 1 }));
describe( 'REST store with nocache', testWithConfig({ noCache: true, foo:2 }) );

});
