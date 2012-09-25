require(['JBrowse/View/Export/GFF3'],function( ExportGFF3 ) {
describe( "GFF3 Exporter", function() {
    var e = new ExportGFF3();

    it( 'constructs', function() {
            expect(e).toBeTruthy();
    });

    it( 'escapes things correctly', function() {
            expect( e._gff3_escape("\n ;=") ).toEqual('%0A %3B%3D');
            expect( e._gff3_escape(42) ).toEqual('42');
    });
});
});