require([
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/request/xhr',
            'JBrowse/Browser',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Util/GFF3',
            'JBrowse/Store/SeqFeature/GFF3/Parser',
            'JBrowse/Store/SeqFeature/GFF3'
        ], function(
            array,
            lang,
            xhr,
            Browser,
            XHRBlob,
            GFF3,
            Parser,
            GFF3Store
        ) {
describe( 'GFF3 utils', function() {
    array.forEach([
                      ['foo=bar', { foo: ['bar'] }],
                      ['ID=Beep%2Cbonk%3B+Foo\n', { ID: ['Beep,bonk;+Foo'] }]
                  ],
                  function( testcase ) {
                      it( 'parses attr string "'+testcase[0]+'" correctly', function() {
                              expect( GFF3.parse_attributes(testcase[0]) ).toEqual( testcase[1] );
                      });
                  });


    array.forEach([
                      [
                          "FooSeq\tbarsource\tmatch\t234\t234\t0\t+\t.\tID=Beep%2Cbonk%3B+Foo\n",
                          {
                              'attributes' : {
                                  'ID' : [
                                      'Beep,bonk;+Foo'
                                  ]
                              },
                              'end' : 234,
                              'phase' : null,
                              'score' : 0,
                              'seq_id' : 'FooSeq',
                              'source' : 'barsource',
                              'start' : 234,
                              'strand' : 1,
                              'type' : 'match'
                          }
                      ],
                      [
                          GFF3.escape("Noggin,+-\%Foo\tbar")+"\tbarsource\tmatch\t234\t234\t0\t+\t.\t.\n",
                          {
                              'attributes' : {},
                              'end' : 234,
                              'phase' : null,
                              'score' : 0,
                              'seq_id' : "Noggin,+-\%Foo\tbar",
                              'source' : 'barsource',
                              'start' : 234,
                              'strand' : 1,
                              'type' : 'match'
                          }
                      ]
                  ],
                  function( testcase ) {
                      it( 'roundtrips feature line "'+testcase[0]+'" correctly', function() {
                              expect( GFF3.parse_feature( testcase[0] ) ).toEqual( testcase[1] );
                              expect( GFF3.format_feature( testcase[1] ) ).toEqual( testcase[0] );
                              expect( GFF3.format_feature( GFF3.parse_feature( testcase[0] ) ) ).toEqual( testcase[0] );
                              expect( GFF3.parse_feature( GFF3.format_feature( testcase[1] ) ) ).toEqual( testcase[1] );
                      });
                  });

});

describe( 'GFF3 parser', function() {
   it( 'can parse gff3_with_syncs.gff3', function() {
           var stuff = { features: [], directives: [], fasta: [] };
           var parseFinished, fetched;
           var p = new Parser({
                                  featureCallback: function(f) {
                                      stuff.features.push(f);
                                  },
                                  directiveCallback: function(d) {
                                      stuff.directives.push(d);
                                  },
                                  endCallback: function() {
                                      parseFinished = true;
                                  }
                              });
           var f =  new XHRBlob( '../data/gff3_with_syncs.gff3' );
           f.fetchLines( function(l) { p.addLine( l ); },
                         function()  { p.finish();     },
                         function(e) { console.error(e); } );
           var referenceResult;
           xhr( '../data/gff3_with_syncs.result.json', { handleAs: 'json' } )
               .then( function(data) { referenceResult = data; } );

           waitsFor( function() { return parseFinished && referenceResult; } );
           runs( function() {
               expect( stuff ).toEqual( referenceResult );
           });
   });
});

describe( 'GFF3 store', function() {
   it( 'can parse volvox.gff3', function() {
           var p = new GFF3Store({
                                     browser: new Browser({ unitTestMode: true }),
                                     blob: new XHRBlob( '../../sample_data/raw/volvox/volvox.gff3' ),
                                     refSeq: { name: 'ctgA', start: 0, end: 50001 }
                                 });
           (function() {
               var features = [];
               var done;

               p.getFeatures(
                   { ref: 'ctgA', start: 1, end: 50000 },
                   function(f) { features.push(f); },
                   function() { done = true; },
                   function(e) { console.error(e); }
               );

               waitsFor( function() { return done; } );
               runs( function() {
                         //console.log( features );
                         expect( features.length ).toEqual( 197 );
                         var edenIndex;
                         array.some( features, function(f,i) {
                                         if( f.get('name') == 'EDEN' ) {
                                             edenIndex = i;
                                             return true;
                                         }
                                         return false;
                                     });
                         expect( edenIndex ).toBeGreaterThan( 3 );
                         expect( edenIndex ).toBeLessThan( 7 );
                         expect( features[edenIndex].get('subfeatures').length ).toEqual( 3 );
                         expect( features[edenIndex].get('subfeatures')[0].get('subfeatures').length ).toEqual( 6 );
                     });
           }).call();

           (function() {
               var features = [];
               var done;

               p.getFeatures(
                   { ref: 'ctgA', start: -1, end: 2499 },
                   function(f) { features.push(f); },
                   function() { done = true; },
                   function(e) { console.error(e); }
               );

               waitsFor( function() { return done; } );
               runs( function() {
                         //console.log( features );
                         expect( features.length ).toEqual( 13 );
                         // expect( features[191].get('subfeatures').length ).toEqual( 3 );
                         // expect( features[191].get('subfeatures')[0].get('subfeatures').length ).toEqual( 6 );
                     });
           }).call();

           (function() {
               var features = [];
               var done;

               p.getFeatures(
                   { ref: 'ctgB', start: -1, end: 5000 },
                   function(f) { features.push(f); },
                   function() { done = true; },
                   function(e) { console.error(e); }
               );

               waitsFor( function() { return done; } );
               runs( function() {
                         //console.log( features );
                         expect( features.length ).toEqual( 4 );
                         // expect( features[191].get('subfeatures').length ).toEqual( 3 );
                         // expect( features[191].get('subfeatures')[0].get('subfeatures').length ).toEqual( 6 );
                         expect( features[3].get('note') ).toEqual( 'ああ、この機能は、世界中を旅しています！' );
                     });
           }).call();
   });
});

});
