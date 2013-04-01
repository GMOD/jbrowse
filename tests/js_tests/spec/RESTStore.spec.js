require([
            'dojo/aspect',
            'JBrowse/Store/SeqFeature/REST'
        ], function( aspect, RESTStore ) {
describe( 'REST store', function() {
              var store = new RESTStore({
                  browser: {},
                  baseUrl: '../data/rest_store_test/',
                  refSeq: { name: 'ctgA', start: 1, end: 500001 }
              });


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

});
});
