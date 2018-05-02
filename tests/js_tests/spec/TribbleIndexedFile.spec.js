require([
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/Browser',
            'JBrowse/Store/TribbleIndexedFile',
            'JBrowse/Model/XHRBlob'
        ],function( declare, array, Browser, TribbleIndexedFile, XHRBlob ) {

describe( "tribble-indexed file", function() {

var VCFIndexedFile = declare( TribbleIndexedFile, {
    parseItem: function() {
        var i = this.inherited( arguments );
        if( i ) {
            i.start--;
            i.end = i.start + i.fields[3].length;
        }
        return i;
    },

    getColumnNumbers: function() {
        return {
            ref: 1,
            start: 2,
            end: -1
        }
    }
});

    var f;
    beforeEach( function() {
        f = new VCFIndexedFile({
                browser: new Browser({ unitTestMode: true }),
                idx:  new XHRBlob( '../data/1801160099-N32519_26611_S51_56704.hard-filtered.vcf.idx'),
                file:  new XHRBlob( '../data/1801160099-N32519_26611_S51_56704.hard-filtered.vcf'),
            });
    });

    it( 'can read 17:41200000..41290000', function() {
            var items = [];
            f.getLines( '17', 41200000, 41290000,
                     function(i) {
                         items.push(i);
                     },
                     function() {
                         items.done = true;
                     }
                   );

            waitsFor( function(){ return items.done; } );
            runs(function() {
                     expect( items.length ).toEqual( 9 );
                     array.forEach( items, function( item,i ) {
                       expect( item.ref ).toEqual('17');
                       expect( item.start ).toBeGreaterThan( 41200000 );
                       expect( item.start ).toBeLessThan( 41290000 );
                     });
                 });

    });


});
});
