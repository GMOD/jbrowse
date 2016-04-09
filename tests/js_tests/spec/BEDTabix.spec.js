require([
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/request/xhr',
            'JBrowse/Browser',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Store/SeqFeature/BEDTabix/Parser',
            'JBrowse/Store/SeqFeature/BEDTabix'
        ], function(
            array,
            lang,
            xhr,
            Browser,
            XHRBlob,
            Parser,
            BEDTabixStore
        ) {

describe( 'BED store', function() {
    it( 'can parse volvox_tabix.bed.gz', function() {
        var p = new BEDTabixStore({
            browser: new Browser({ unitTestMode: true }),
            file: new XHRBlob( '../../sample_data/raw/volvox/volvox.sort.bed.gz.1' ),
            tbi: new XHRBlob( '../../sample_data/raw/volvox/volvox.sort.bed.gz.tbi' ),
            refSeq: { name: 'ctgA', start: 0, end: 50001 }
        });
        (function() {
            var features = [];
            p.getFeatures(
                { ref: 'ctgA', start: 1, end: 50000 },
                function(f) { features.push(f); },
                function() { features.done = true },
                function(e) { console.error(e.stack||''+e); }
            );

            waitsFor( function() { return features.done; } );
            runs( function() {
                //console.log( features );
                expect( features.length ).toEqual( 109 );
            });
        }).call();

    });
});

});
