require([
            'dojo/aspect',
            'JBrowse/Browser',
            'JBrowse/Store/SeqFeature/BAM',
            'JBrowse/Model/XHRBlob'
        ], function( aspect, Browser, BAMStore, XHRBlob ) {

// function distinctBins( features ) {
//     var bins = {};
//     features.forEach( function(f) {
//         bins[ f.data._bin ] = ( bins[ f.data._bin ] || 0 ) + 1;
//     });
//     return bins;
// }

describe( 'BAM with volvox-sorted.bam', function() {
              var b;
              beforeEach( function() {
                  b = new BAMStore({
                                       browser: new Browser({ unitTestMode: true }),
                                       bam: new XHRBlob('../../sample_data/raw/volvox/volvox-sorted.bam'),
                                       bai: new XHRBlob('../../sample_data/raw/volvox/volvox-sorted.bam.bai')
                                   });
              });

              it( 'constructs', function() {
                      expect(b).toBeTruthy();
                  });

              it( 'loads some data', function() {
                      var loaded;
                      var features = [];
                      var done;
                      aspect.after( b, 'loadSuccess', function() {
                          loaded = true;
                      });
                      b.getFeatures({ ref: 'ctgA', start: 0, end: 50000 },
                                 function( feature ) {
                                     features.push( feature );
                                 },
                                 function() {
                                     done = true;
                                 }
                               );
                      waitsFor( function() { return done; }, 2000 );
                      runs( function() {
                                expect(features.length).toBeGreaterThan(1000);
                            });
                  });
});

describe( 'BAM with test_deletion_2_0.snps.bwa_align.sorted.grouped.bam', function() {
              var b;
              beforeEach( function() {
                  b = new BAMStore({
                      browser: new Browser({ unitTestMode: true }),
                      bam: new XHRBlob('../data/test_deletion_2_0.snps.bwa_align.sorted.grouped.bam'),
                      bai: new XHRBlob('../data/test_deletion_2_0.snps.bwa_align.sorted.grouped.bam.bai')
                  });
              });

              it( 'constructs', function() {
                      expect(b).toBeTruthy();
                  });

              it( 'loads some data', function() {
                      var loaded;
                      var features = [];
                      var done;
                      aspect.after( b, 'loadSuccess', function() {
                          loaded = true;
                      });
                      b.getFeatures({ ref: 'chromosome', start: 17000, end: 18000 },
                                 function( feature ) {
                                     features.push( feature );
                                 },
                                 function() {
                                     done = true;
                                 }
                               );
                      waitsFor( function() { return done; }, 2000 );
                      runs( function() {
                                expect(features.length).toEqual(124);
                                //console.log( distinctBins(features) );
                            });
                  });
});

describe( 'empty BAM', function() {
              var b;
              beforeEach( function() {
                  b = new BAMStore({
                      browser: new Browser({ unitTestMode: true }),
                      bam: new XHRBlob('../data/empty.bam'),
                      bai: new XHRBlob('../data/empty.bam.bai')
                  });
              });

              it( 'constructs', function() {
                      expect(b).toBeTruthy();
                  });

              it( "returns no data, but doesn't crash", function() {
                      var loaded;
                      var features = [];
                      var done;
                      aspect.after( b, 'loadSuccess', function() {
                          loaded = true;
                      });
                      b.getFeatures( { ref: 'ctgA', start: 0, end: 50000 },
                                 function( feature ) {
                                     features.push( feature );
                                 },
                                 function() {
                                     done = true;
                                 }
                               );
                      waitsFor( function() { return done; }, 2000 );
                      runs( function() {
                                expect(features.length).toEqual( 0 );
                            });
                  });
});

describe( 'BAM with tests/data/final.merged.sorted.rgid.mkdup.realign.recal.bam', function() {
              var b;
              beforeEach( function() {
                  b = new BAMStore({
                      browser: new Browser({ unitTestMode: true }),
                      bam: new XHRBlob('../data/final.merged.sorted.rgid.mkdup.realign.recal.bam'),
                      bai: new XHRBlob('../data/final.merged.sorted.rgid.mkdup.realign.recal.bam.bai')
                  });
              });

              it( 'constructs', function() {
                      expect(b).toBeTruthy();
                  });

              it( 'loads some data', function() {
                      var loaded;
                      var features = [];
                      var done;
                      aspect.after( b, 'loadSuccess', function() {
                          loaded = true;
                      });
                      b.getFeatures({ ref: 'chr21_gl000210_RANDOM', start: 16589, end: 18964 },
                                 function( feature ) {
                                     features.push( feature );
                                 },
                                 function() {
                                     done = true;
                                 }
                               );
                      waitsFor( function() { return done; }, 2000 );
                      runs( function() {
                                expect(features.length).toEqual(281);
                                //console.log( distinctBins(features) );
                            });
                  });
});

// only run the cabone_test_2 if it's in the URL someplace
if( document.location.href.indexOf('extended_tests=1') > -1 ) {
    describe( 'BAM with carbone_test_2', function() {
                  var b;
                  beforeEach( function() {
                      b = new BAMStore({
                          browser: new Browser({ unitTestMode: true }),
                          bam: new XHRBlob('../../../data/carbone_test_2/RIB40_278_k51_cd_hit_est_sorted.bam'),
                          bai: new XHRBlob('../../../data/carbone_test_2/RIB40_278_k51_cd_hit_est_sorted.bam.bai')
                      });
                  });

                  it( 'loads some data', function() {
                          var loaded;
                          var features = [];
                          var done;
                          aspect.after( b, 'loadSuccess', function() {
                              loaded = true;
                          });

    // need 2:3905491-4019507 NODE_423_length_210786_cov_16.121635 3919331 3979772

                          b.getFeatures({ ref: 'ctga', start: 3799999, end: 4049999 },
                                     function( feature ) {
                                         features.push( feature );
                                     },
                                     function() {
                                         done = true;
                                     }
                                   );
                          waitsFor( function() { return done; }, 2000 );
                          runs( function() {
                                    expect(features.length).toEqual(13);
                                    //console.log( distinctBins(features) );
                                });
                      });
    });

}

});

