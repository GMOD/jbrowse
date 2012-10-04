require(['JBrowse/Store/BigWig','JBrowse/Model/XHRBlob'], function( BigWig, XHRBlob ) {
    describe( 'BigWig with volvox_microarray.bw', function() {
        var b = new BigWig({
            blob: new XHRBlob('../../sample_data/raw/volvox/volvox_microarray.bw')
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
            v.readWigData( 'ctgA', 0, 10000, function(features) {
                wigData = features;
            });
            waitsFor(function() { return wigData; },1000);
            runs(function() {
                expect(wigData.length).toBeGreaterThan(100);
                dojo.forEach( wigData.slice(1,20), function(feature) {
                    expect(feature.get('start')).toBeGreaterThan(0);
                    expect(feature.get('end')).toBeLessThan(10000);
                });
                     //console.log(wigData);
            });
        });

        it('reads some good data when zoomed out', function() {
            var v = b.getView( 1/20000 );
            var wigData;
            v.readWigData( 'ctgA', 100, 20000, function(features) {
                wigData = features;
            });
            waitsFor(function() { return wigData; },500);
            runs(function() {
                expect(wigData.length).toEqual(2);
                dojo.forEach( wigData, function(feature) {
                    expect(feature.get('start')).toBeGreaterThan( -1 );
                    expect(feature.get('end')).toBeLessThan( 40000 );
                });
                   console.log(wigData);
            });
        });

        it('reads the file stats (the totalSummary section)', function() {
               var stats = b.getGlobalStats();
               expect(stats.basesCovered).toEqual(50690);
               expect(stats.minVal).toEqual(100);
               expect(stats.maxVal).toEqual(899);
               expect(stats.sumData).toEqual(16863706);
               expect(stats.sumSquares).toEqual(8911515204);
               expect(stats.stdDev).toEqual(255.20080383762445);
               expect(stats.mean).toEqual(332.6830933122904);
        });

        it('reads good data when zoomed very little', function() {
            var v = b.getView( 1/17.34 );
            var wigData;
            v.readWigData( 'ctgA', 19999, 24999, function(features) {
                wigData = features;
            });
            waitsFor(function() { return wigData; },1000);
            runs(function() {
                expect(wigData.length).toBeGreaterThan(19);
                expect(wigData.length).toBeLessThan(1000);
                dojo.forEach( wigData, function(feature) {
                    expect(feature.get('start')).toBeGreaterThan(10000);
                    expect(feature.get('end')).toBeLessThan(30000);
                });
                     //console.log(wigData);
            });
        });

    });
});
