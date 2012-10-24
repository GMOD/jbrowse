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
});