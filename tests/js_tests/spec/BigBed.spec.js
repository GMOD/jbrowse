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

        (function() {
            var features = [];
            b.getFeatures(
                { ref: 'ctgA', start: 1, end: 50000 },
                function(f) { features.push(f); },
                function() { features.done = true },
                function(e) { console.error(e.stack||''+e); }
            );

            waitsFor( function() { return features.done; } );
            runs( function() {
                      //console.log( features );
                      expect( features.length ).toEqual( 4 );
                      var edenIndex;
                      array.some( features, function(f,i) {
                                      if( f.get('name') == 'EDEN.1' ) {
                                          edenIndex = i;
                                          return true;
                                      }
                                      return false;
                                  });
                      console.log(edenIndex);

                      expect( edenIndex ).toBe( 0 );
                      expect( features[edenIndex].get('subfeatures').length ).toEqual( 8 );
                  });
        }).call();


    });
});
