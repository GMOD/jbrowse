require([
            'JBrowse/Browser',
            'JBrowse/Store/SeqFeature/SequenceChunks'
        ], function( Browser, ChunkStore ) {

describe( 'sequence chunk store', function() {
              var s;
              beforeEach( function() {
                  s = new ChunkStore({
                                         browser: new Browser({ unitTestMode: true }),
                                         config: {
                                             baseUrl: "../../sample_data/json/volvox/",
                                             chunkSize: 20000
                                         }
                                   });
              });

              it( 'fetches some features', function() {
                      var done, features = [];
                      s.getFeatures( { ref: 'ctga', start: 100, end: 40000 } )
                          .each( function(f) { features.push(f); },
                                 function() { done = true; },
                                 function(e) { console.error( e.stack || ''+e); }
                               )
                          .run();
                      waitsFor(function() { return done; });
                      runs( function() {
                                expect( features.length ).toEqual( 2 );
                                expect( features[0].get('residues').length ).toEqual( 20000 );
                                expect( features[1].get('residues').length ).toEqual( 20000 );
                            });
              });

              function testfetch( name, start, end, expectSeq ) {
                      var seq;
                      var d = s.getReferenceFeatures({ ref: name } )
                          .forEach( function(s) { seq = s; },
                                    function( ) { return seq.getSequence(start,end); },
                                    function(e) { console.error(e); }
                                  )
                          .then( function( sequenceFragment ) {
                                     seq = sequenceFragment;
                                 });

                      waitsFor(function() { return d.isFulfilled(); });
                      runs( function() {
                                expect( seq ).toEqual( expectSeq );
                            });
              }

              it( 'fetches ref seq as string 1', function() {
                      testfetch( 'ctga', 0, 5, 'cattg' );
              });
              it( 'fetches ref seq as string 2', function() {
                      testfetch( 'ctga', 1, 5, 'attg' );
              });

              it( 'fetches ref seq as string 3', function() {
                      testfetch( 'ctga', 49999, 50001, 'ac' );
              });

              it( 'fetches ref seq as string 4', function() {
                      testfetch( 'ctga', 100, 105, 'agcgg' );
              });

              it( 'fetches ref seq as string 5', function() {
                      testfetch( 'ctga', 19996, 20005, 'ttaccgcgt' );
              });

              it( 'fetches ref seq as string 6, with space padding at the beginning', function() {
                      testfetch( 'ctga', -3, 5, "   cattg");
              });

              it( 'fetches ref seq as string 7, with space padding at the end', function() {
                      testfetch( 'ctga', 49999, 50003, "ac  ");
              });

              it( 'fetches ref seq as string 8, with space padding at the beginning', function() {
                      testfetch( 'ctga', -5, 1, '     c' );
              });

              it( 'fetches ref seq as string 9, with space padding at the beginning', function() {
                      testfetch( 'ctga', -28, 1, "                            c" );
              });
}
);
});
