require(['JBrowse/Store/BigWig','JBrowse/Model/XHRBlob'], function( BigWig, XHRBlob ) {
    describe( 'BigWig with tomato RNAseq coverage', function() {
        var b = new BigWig({
            blob: new XHRBlob('../data/SL2.40_all_rna_seq.v1.bigwig')
        });

        it('constructs', function(){ expect(b).toBeTruthy(); });

        it('returns empty array of features for a nonexistent chrom', function() {
            var v = b.getUnzoomedView();
            var wigData;
            v.readWigData( 'nonexistent', 1, 10000, function(features) {
                wigData = features;
            });
            waitsFor(function() { return wigData; });
            runs(function() {
                expect(wigData.length).toEqual(0);
            });
        });

        it('reads some good data unzoomed', function() {
            var v = b.getUnzoomedView();
            var wigData;
            v.readWigData( 'SL2.40ch01', 1, 100000, function(features) {
                wigData = features;
            });
            waitsFor(function() { return wigData; },1000);
            runs(function() {
                expect(wigData.length).toBeGreaterThan(10000);
                dojo.forEach( wigData.slice(0,10), function(feature) {
                    expect(feature.min).toBeGreaterThan(0);
                    expect(feature.get('start')).toBeGreaterThan(0);
                    expect(feature.max).toBeLessThan(100001);
                    expect(feature.get('end')).toBeLessThan(100001);
                });
//                console.log(wigData);
            });
        });

    });
});
