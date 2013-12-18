require([
            'JBrowse/Browser',
            'JBrowse/Store/SeqFeature/VCFTabix',
            'JBrowse/Model/XHRBlob'
        ],
        function(
            Browser,
            VCFStore,
            XHRBlob
        ) {
describe('VCF store', function() {

  

  it('reads big dbsnp', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../../../data/big_vcf/00-All.vcf.gz',
                 baseUrl: '.'
             },
             refSeq: { name: 'chr10', start: 0, end: 135534747 }
         });

         var features = [];
         waitsFor( function() { return features.done; } );
         store.getFeatures({ ref: 'chr10',
                             start: 33870887,
                             end: 33896487
                           },
                           function(f) { features.push( f ); },
                           function( ) { features.done = true; },
                           function(e) { console.error(e.stack||''+e); }
                          );
         runs(function() {
                  expect(features.length).toEqual( 560 );
         });

  });

});
});