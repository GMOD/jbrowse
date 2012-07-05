require(['JBrowse/Store/BigWig','JBrowse/Model/XHRBlob'], function( BigWig, XHRBlob ) {
    describe( 'BigWig with tomato RNAseq coverage', function() {
        var b = new BigWig({
            blob: new XHRBlob('../data/SL2.40_all_rna_seq.v1.bigwig')
        });

        it('constructs', function(){ expect(b).toBeTruthy(); });
    });
});
