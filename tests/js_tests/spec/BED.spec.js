require([
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/request/xhr',
            'JBrowse/Browser',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Store/SeqFeature/BED'
        ], function(
            array,
            lang,
            xhr,
            Browser,
            XHRBlob,
            BEDStore
        ) {

describe( 'BED store', function() {
    it( 'can parse volvox-remark.bed', function() {
        var p = new BEDStore({
            browser: new Browser({ unitTestMode: true }),
            blob: new XHRBlob( '../../sample_data/raw/volvox/volvox-remark.bed' ),
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
                console.log( features );
                expect( features.length>0 ).toEqual( true );
            });
        }).call();

    });
});

});
