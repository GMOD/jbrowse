require([
            'JBrowse/Browser',
            'JBrowse/Model/TabixIndex',
            'JBrowse/Model/Resource/BGZBytes'
        ],function( Browser, TabixIndex, BGZBytes ) {

describe( "TabixIndex", function() {

              var ti;
              beforeEach(function() {
                  var browser = new Browser({ unitTestMode: true });
                  ti = new TabixIndex({
                                          blob: browser.openResource( BGZBytes, '../../sample_data/raw/volvox/volvox.test.vcf.gz.tbi' ),
                                          browser: browser
                                     });
              });

              it('constructs', function() {
                     expect( ti ).toBeTruthy();
                 });
              it( 'loads', function() {
                      var loaded;
                      waitsFor( function() { return loaded; }, 1000 );
                      ti.load().then( function() {
                          loaded = true;
                      });
                      runs( function() {
                          expect( ti.columnNumbers.start ).toEqual( 2 );
                          expect( ti.columnNumbers.ref ).toEqual( 1 );
                          expect( ti.columnNumbers.end ).toEqual( 0 );
                          console.log( ti );
                          var blocks = ti.blocksForRange( 'ctgA', 1, 4000 );
                          expect( blocks.length ).toEqual( 1 );
                          expect( blocks[0].minv.block ).toEqual( 0 );
                          expect( blocks[0].minv.offset ).toEqual( 10431 );
                          console.log( blocks );
                      });
              });
});
});
