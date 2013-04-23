require([
            'dojo/_base/array',
            'JBrowse/Browser'
        ], function( array, Browser ) {

describe( 'centralized ref seq name regularization', function() {

    var b = new Browser({ unitTestMode: true });

    var testCases = [
        [ 'ctgA', 'ctga' ],
        [ 'chrom01', 'chr1' ],
        [ 'chr01', 'chr1' ],
        [ 'CHROMOSOME11', 'chr11' ],
        [ 'SCAFFOLD0231', 'scaffold231' ],
        [ 'contig47', 'ctg47' ],
        [ 'ctg47', 'ctg47' ],
        [ 'Oryza_sativa_1234.01', 'oryza_sativa_1234.01' ],
        [ '01', 'chr1' ],
        [ '1', 'chr1' ]
    ];
    array.forEach( testCases, function( testCase ) {
        it( 'works for '+testCase[0], function() {
            expect( b.regularizeReferenceName( testCase[0] ) ).toEqual( testCase[1] );
        });
    });

});
});