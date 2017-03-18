require([
            'JBrowse/View/FileDialog/TrackList/BAMDriver'
        ], function( BAMDriver ) {

describe( 'FileDialog BAM driver', function() {
              it( 'can match a simple BAM URL with its BAI URL', function( ) {
                      var confs = { foo: { baiUrlTemplate: 'zee.bam.bai' } };
                      expect( (new BAMDriver()).tryResource( confs, { type: 'bam', url: 'zee.bam' } ) )
                          .toBeTruthy();
                      expect( confs.foo.bam.url ).toEqual( 'zee.bam' );
                  });

              it( 'can match a simple BAM file with its BAI URL', function( ) {
                      var confs = { foo: { baiUrlTemplate: 'zee.bam.bai' } };
                      expect( (new BAMDriver()).tryResource( confs, { type: 'bam', file: { name: 'zee.bam'} } ) )
                          .toBeTruthy();
                      expect( confs.foo.bam.blob.name ).toEqual( 'zee.bam' );
                  });

              it( 'can match a simple BAM file with its BAI XHRBlob', function( ) {
                      var confs = { foo: { bai: { url: 'zee.bam.bai'} } };
                      expect( (new BAMDriver()).tryResource( confs, { type: 'bam', file: { name: 'zee.bam'} } ) )
                          .toBeTruthy();
                      expect( confs.foo.bam.blob.name ).toEqual( 'zee.bam' );
                  });


          });


});

