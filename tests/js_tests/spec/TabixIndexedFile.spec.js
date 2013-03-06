require({
            packages: [{ name: 'jDataView', main: 'jdataview', location: '../jDataView/src' }]
        },
        [
            'dojo/_base/array',
            'JBrowse/Store/TabixIndexedFile',
            'JBrowse/Model/XHRBlob'
        ],function( array, TabixIndexedFile, XHRBlob ) {

describe( "tabix-indexed file", function() {

    var f;
    beforeEach( function() {
        f = new TabixIndexedFile({
                tbi:  new XHRBlob( '../../sample_data/raw/volvox/volvox.vcf.gz.tbi' ),
                file: new XHRBlob( '../../sample_data/raw/volvox/volvox.vcf.gz' )
            });
    });

    it( 'can read ctgA:1000..4000', function() {
            var items = [];
            f.fetch( 'ctgA', 1000, 4000,
                     function(i) {
                         items.push(i);
                     },
                     function() {
                         items.done = true;
                     }
                   );

            waitsFor( function(){ return items.done; } );
            runs(function() {
                     expect( items.length ).toEqual( 8 );
                     array.forEach( items, function( item,i ) {
                       expect( item.ref ).toEqual('ctgA');
                       expect( item.start ).toBeGreaterThan( 999 );
                       expect( item.start ).toBeLessThan( 4001 );
                     });
                 });

    });


});
});