require([
            'dojo/aspect',
            'JBrowse/Store/SeqFeature/BAM',
            'JBrowse/Model/XHRBlob'
        ], function( aspect, BAMStore, XHRBlob ) {
describe( 'BAM with volvox-sorted.bam', function() {
              var b = new BAMStore({
                  bam: new XHRBlob('../../sample_data/raw/volvox/volvox-sorted.bam'),
                  bai: new XHRBlob('../../sample_data/raw/volvox/volvox-sorted.bam.bai'),
                  refSeq: { name: 'ctgA', start: 1, end: 500001 }
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
                      b.load();
                      b.iterate( 0, 50000,
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
              var b = new BAMStore({
                  bam: new XHRBlob('../data/test_deletion_2_0.snps.bwa_align.sorted.grouped.bam'),
                  bai: new XHRBlob('../data/test_deletion_2_0.snps.bwa_align.sorted.grouped.bam.bai'),
                  refSeq: { name: 'Chromosome', start: 1, end: 20000 }
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
                      b.load();
                      b.iterate( 17000, 18000,
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
                                console.log( distinctBins(features) );
                            });
                  });
});
});

function distinctBins( features ) {
    var bins = {};
    features.forEach( function(f) {
        bins[ f.data._bin ] = ( bins[ f.data._bin ] || 0 ) + 1;
    });
    return bins;
}