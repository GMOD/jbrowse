require([
            'dojo/request/xhr',
            'dojo/_base/lang',
            'JBrowse/Browser',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Store/SeqFeature/Cytoband/Parser',
            'JBrowse/Store/SeqFeature/Cytoband'
        ], function(
            xhr,
            lang,
            Browser,
            XHRBlob,
            Parser,
            CytobandStore
        ) {

describe( 'Cytoband parser', function() {
   it( 'can parse Cytoband', function() {
           var stuff = [];
           var parseFinished, fetched;
           var p = new Parser({
               featureCallback : function(f) {
                   stuff.features.push(f);
               },
               endCallback : function(){
                   parseFinished = true;
               }
           });
           var f =  new XHRBlob( '../data/Cytoband_test.txt' );
           f.fetchLines( function(l) { p.addLine( l ); },
                         function()  { p.finish();     },
                         function(e) { console.error(e); } );
           var referenceResult;
           xhr( '../data/Cytoband.result.json', { handleAs: 'json' } )
               .then( function(data) { referenceResult = data; } );

           waitsFor( function() { return parseFinished && referenceResult; } );
           runs( function() {
               expect( stuff ).toEqual( referenceResult );
           });
   });
});

describe( 'Cytoband store', function() {
   it( 'can pass off files to the Parser', function() {
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
                         expect( features[6].get('subfeatures').length ).toEqual( 3 );
                         expect( features[6].get('subfeatures')[0].get('subfeatures').length ).toEqual( 6 );
                     });
           }).call();

   });
});

});
