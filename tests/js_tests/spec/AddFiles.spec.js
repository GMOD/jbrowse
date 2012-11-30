require([
            'JBrowse/View/FileDialog/TrackList/BAMDriver'
        ], function( BAMDriver ) {

describe( 'BAM driver', function() {
              it( 'can match a simple BAM URL with its BAI URL', function( ) {
                      var confs = { foo: { baiUrlTemplate: 'zee.bam.bai' } };
                      expect( BAMDriver.tryResource( confs, { type: 'bam', url: 'zee.bam' } ) )
                          .toBeTruthy();
                      expect( confs.foo.bam.url ).toEqual( 'zee.bam' );
                  });

              it( 'can match a simple BAM file with its BAI URL', function( ) {
                      var confs = { foo: { baiUrlTemplate: 'zee.bam.bai' } };
                      expect( BAMDriver.tryResource( confs, { type: 'bam', file: { name: 'zee.bam'} } ) )
                          .toBeTruthy();
                      expect( confs.foo.bam.blob.name ).toEqual( 'zee.bam' );
                  });

              it( 'matches a BAI file like zee.bai -> zee.bam', function( ) {
                      var confs = { foo: { urlTemplate: '/zee.bam' } };
                      expect( BAMDriver.tryResource( confs, { type: 'bai', file: { name: 'zee.bai'} } ) )
                          .toBeTruthy();
                      expect( confs.foo.bai.blob.name ).toEqual( 'zee.bai' );
                  });

              it( 'matches a BAM file like zee.bam -> zee.bai', function( ) {
                      var confs = { foo: { baiUrlTemplate: '/zee.bai' } };
                      expect( BAMDriver.tryResource( confs, { type: 'bam', file: { name: 'zee.bam'} } ) )
                          .toBeTruthy();
                      expect( confs.foo.bam.blob.name ).toEqual( 'zee.bam' );
                  });


          });


});

