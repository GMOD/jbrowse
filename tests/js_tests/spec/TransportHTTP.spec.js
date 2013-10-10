require([
            'JBrowse/Browser',
            'JBrowse/Transport/HTTP'
        ], function(
            Browser,
            HTTP
        ) {

describe( 'HTTP transport driver', function() {
              var transport;
              beforeEach( function() {
                              var b = new Browser({ unitTestMode: true });
                  transport = new HTTP({
                                           transportManager: b, browser: b, authManager: b
                                   });
              });

              it( 'can fetch text with no credentials', function() {
                      var data;
                      transport.request('../data/redundant.gff3', { handleAs: 'text'})
                               .then( function(d) { data = d; } );
                      waitsFor( function() { return data; } );
                      runs( function() {
                                expect( data.length ).toEqual(127);
                      });
              });

              it( 'can fetch a byte range with no credentials', function() {
                      var data;
                      transport.request('../data/test_deletion_2_0.snps.bwa_align.sorted.grouped.bam',
                                        { handleAs: 'arraybuffer',
                                          range: [20,40]
                                        })
                               .then( function(d) { data = d; } );
                      waitsFor( function() { return data; } );
                      runs( function() {
                                expect( data.byteLength ).toEqual(21);
                                expect( (new Uint8Array(data))[2] ).toEqual( 108 );
                      });
              });

              if( document.location.href.indexOf('credential_tests=1') > -1 ) {

                  it( 'can fetch a byte range with HTTP Basic credentials', function() {
                          var data;
                          transport.request('../data/restricted/httpbasic/empty.bigWig',
                                            { handleAs: 'arraybuffer',
                                              range: [0,200]
                                            })
                                   .then( function(d) { data = d; } );
                          waitsFor( function() { return data; }, 5000 );
                          runs( function() {
                                    expect( data.byteLength ).toEqual(201);
                                });
                      });
              }
});
});
