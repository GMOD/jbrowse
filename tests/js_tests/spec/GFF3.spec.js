require([
            'dojo/_base/array',
            'JBrowse/Util/GFF3'
        ], function( array, Parser ) {
describe( 'GFF3 parser', function() {

    array.forEach([
                      ['foo=bar', { foo: ['bar'] }],
                      ['ID=Beep%2Cbonk%3B+Foo\n', { ID: ['Beep,bonk;+Foo'] }]
                  ],
                  function( testcase ) {
                      it( 'parses attr string "'+testcase[0]+'" correctly', function() {
                              expect( Parser.parse_attributes(testcase[0]) ).toEqual( testcase[1] );
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
                              'phase' : undefined,
                              'score' : 0,
                              'seq_id' : 'FooSeq',
                              'source' : 'barsource',
                              'start' : 234,
                              'strand' : '+',
                              'type' : 'match'
                          }
                      ],
                      [
                          Parser.escape("Noggin,+-\%Foo\tbar")+"\tbarsource\tmatch\t234\t234\t0\t+\t.\t.\n",
                          {
                              'attributes' : {},
                              'end' : 234,
                              'phase' : undefined,
                              'score' : 0,
                              'seq_id' : "Noggin,+-\%Foo\tbar",
                              'source' : 'barsource',
                              'start' : 234,
                              'strand' : '+',
                              'type' : 'match'
                          }
                      ]
                  ],
                  function( testcase ) {
                      it( 'roundtrips feature line "'+testcase[0]+'" correctly', function() {
                              expect( Parser.parse_feature(testcase[0]) ).toEqual( testcase[1] );
                              expect( Parser.format_feature( testcase[1] )).toEqual( testcase[0] );
                              expect( Parser.format_feature( Parser.parse_feature( testcase[0] ) ) ).toEqual( testcase[0] );
                              expect( Parser.parse_feature( Parser.format_feature( testcase[1] ) ) ).toEqual( testcase[1] );
                      });
                  });




});
});
