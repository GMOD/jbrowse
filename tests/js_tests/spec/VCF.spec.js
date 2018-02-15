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



  xit('reads big dbsnp', function() {
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




  it('reads gvcf * alleles', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../data/gvcf.vcf.gz',
                 baseUrl: '.'
             },
             refSeq: { name: '1', start: 0, end: 5000 }
         });

         var features = [];
         waitsFor( function() { return features.done; } );
         store.getFeatures({ ref: '1',
                             start: 0,
                             end: 5000
                           },
                           function(f) { features.push( f ); },
                           function( ) { features.done = true; },
                           function(e) { console.error(e.stack||''+e); }
                          );
         runs(function() {
                  expect(features.length).toEqual( 7 );
                  expect(features[2].get('alternative_alleles').values).toEqual("TC,<*>");
         });



  });

  it('no newline in VCF genotypes', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../../docs/tutorial/data_files/volvox.test.vcf.gz',
                 baseUrl: '.'
             },
             refSeq: { name: 'ctgA', start: 0, end: 50000 }

         });

         var features = [];
         waitsFor( function() { return features.done; } );
         store.getFeatures({ ref: 'ctgA',
                             start: 0,
                             end: 7000
                           },
                           function(f) { features.push( f ); },
                           function( ) { features.done = true; },
                           function(e) { console.error(e.stack||''+e); }
                          );
         runs(function() {
                  var gt = features[0].get('genotypes');
                  var names = Object.keys(gt);
                  var last = names[names.length-1];
                  expect(last.match("\n")).toEqual(null);
         });

  });

  it('reads gatk non_ref alleles', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../data/raw.g.vcf.gz',
                 baseUrl: '.'
             },
             refSeq: { name: 'ctgA', start: 0, end: 5000 }
         });


         var features = [];
         waitsFor( function() { return features.done; } );
         store.getFeatures({ ref: 'ctgA',
                             start: 0,
                             end: 100
                           },
                           function(f) { features.push( f ); },
                           function( ) { features.done = true; },
                           function(e) { console.error(e.stack||''+e); }
                          );
         runs(function() {
                  expect(features.length).toEqual( 37 );
                  expect(features[0].get('reference_allele')).toEqual(null);
                  expect(features[0].get('alternative_alleles').values).toEqual('<NON_REF>');
         });
  });




  it('parses END field', function() {
         var store = new VCFStore({
             browser: new Browser({unitTestMode: true}),
             config: {
                 urlTemplate: '../data/vcf.end.gz',
                 baseUrl: '.'
             },
             refSeq: { name: '1', start: 0, end: 50000 }
         });

         var features = [];
         waitsFor( function() { return features.done; } );
         store.getFeatures({ ref: '1',
                             start: 0,
                             end: 5000
                           },
                           function(f) { features.push( f ); },
                           function( ) { features.done = true; },
                           function(e) { console.error(e.stack||''+e); }
                          );
         runs(function() {
                  expect(features[0].get('end')).toEqual(4388);
                  expect(features[1].get('end')).toEqual(4600);
                  expect(features.length).toEqual( 2 );
         });

  });



});
});
