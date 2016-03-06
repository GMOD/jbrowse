require([
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/Browser',
            'JBrowse/Store/TabixIndexedFile',
            'JBrowse/Model/XHRBlob'
        ],function( declare, array, Browser, TabixIndexedFile, XHRBlob ) {

describe( "tabix-indexed file", function() {

var VCFIndexedFile = declare( TabixIndexedFile, {
    parseItem: function() {
        var i = this.inherited( arguments );
        if( i ) {
            i.start--;
            i.end = i.start + i.fields[3].length;
        }
        return i;
    }
});

    var f;
    beforeEach( function() {
        f = new VCFIndexedFile({
                browser: new Browser({ unitTestMode: true }),
                tbi:  new XHRBlob( '../../sample_data/raw/volvox/volvox.test.vcf.gz.tbi' ),
                file: new XHRBlob( '../../sample_data/raw/volvox/volvox.test.vcf.gz' )
            });
    });

    it( 'can read ctgA:1000..4000', function() {
            var items = [];
            f.getLines( 'ctgA', 1000, 4000,
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
                       expect( item.ref ).toEqual('contigA');
                       expect( item.start ).toBeGreaterThan( 999 );
                       expect( item.start ).toBeLessThan( 4001 );
                     });
                 });

    });


});
});
