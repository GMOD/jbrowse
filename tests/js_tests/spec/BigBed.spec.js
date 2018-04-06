require([
            'dojo/_base/array',
            'JBrowse/Browser',
            'JBrowse/Store/SeqFeature/BigBed',
            'JBrowse/Model/XHRBlob'
        ], function(
            array,
            Browser,
            BigBed,
            XHRBlob
        ) {

    var errorFunc = function(e) { console.error(e); };

    describe( 'BigBed with volvox eden genes', function() {
        var browser = new Browser({ unitTestMode: true });
        var b = new BigBed({
            browser: browser,
            blob: new XHRBlob('../../sample_data/raw/volvox/volvox.bb')
        });

        it('constructs', function(){ expect(b).toBeTruthy(); });

        it('accesses volvox bigbed', function(){
            var features = [];
            b.getFeatures(
                { ref: 'ctgA', start: 1, end: 50000 },
                function(f) { features.push(f); },
                function() { features.done = true },
                function(e) { console.error(e.stack||''+e); }
            );

            waitsFor( function() { return features.done; } );
            runs( function() {
                expect( features.length ).toEqual( 4 );
                var edenIndex;
                array.some( features, function(f,i) {
                                if( f.get('name') == 'EDEN.1' ) {
                                    edenIndex = i;
                                    return true;
                                }
                                return false;
                            });
                expect( edenIndex ).toBe( 0 );
                expect( features[edenIndex].get('subfeatures').length ).toEqual( 8 );
            });
        });


    });

    describe( 'BigBed with human peaks', function() {
        var browser = new Browser({ unitTestMode: true });
        var b = new BigBed({
            browser: browser,
            blob: new XHRBlob('../data/human_bigbed/peaks.bb')
        });

        it('constructs', function(){ expect(b).toBeTruthy(); });

        it('accesses peaks bigbed', function(){
            var features = [];
            b.getFeatures(
                { ref: 'chr1', start: 18000000, end: 19000000 },
                function(f) { features.push(f); },
                function() { features.done = true },
                function(e) { console.error(e.stack||''+e); }
            );

            waitsFor( function() { return features.done; } );
            runs( function() {
                expect( features.length ).toEqual( 33 );
            });
        });
    });


    describe( 'BigBed with less than bed12 and autosql', function() {
        var browser = new Browser({ unitTestMode: true });
        var b = new BigBed({
            browser: browser,
            blob: new XHRBlob('../data/human_bigbed/genes.bb')
        });

        it('constructs', function(){ expect(b).toBeTruthy(); });

        it('accesses gene bigbed', function(){
            var features = [];
            b.getFeatures(
                { ref: 'chr1', start: 18000000, end: 19000000 },
                function(f) { features.push(f); },
                function() { features.done = true },
                function(e) { console.error(e.stack||''+e); }
            );

            waitsFor( function() { return features.done; } );
            runs( function() {
                expect( features.length ).toEqual( 14 );
                expect(features[0].get('geneSymbol')).toEqual('PRPS1L1');
                expect(features[0].get('name')).toEqual('uc003stz.1');
                expect(features[0].get('strand')).toEqual(-1);
                expect(features[13].get('geneSymbol')).toEqual('HDAC9');
                expect(features[13].get('name')).toEqual('uc003suk.1');
                expect(features[13].get('strand')).toEqual(1);
            });
        });
    });

    describe( 'BigBed GENCODE bed12+4 and autosql with groupfeatures', function() {
        var browser = new Browser({ unitTestMode: true });
        var b = new BigBed({
            browser: browser,
            groupFeatures: true,
            blob: new XHRBlob('../data/human_bigbed/gencode.bb')
        });

        it('constructs', function(){ expect(b).toBeTruthy(); });

        it('accesses gencode bigbed', function(){
            var features = [];
            b.getFeatures(
                { ref: 'chr1', start: 18000000, end: 19000000 },
                function(f) { features.push(f); },
                function() { features.done = true },
                function(e) { console.error(e.stack||''+e); }
            );

            waitsFor( function() { return features.done; } );
            runs( function() {
                console.log(features);
                expect( features.length ).toEqual( 51 );
                expect(features[0].get('name')).toEqual('MICAL3');
                expect(features[0].get('type')).toEqual('gene');
                expect(features[0].children().length).toEqual(3);
            });
        });
    });

});
