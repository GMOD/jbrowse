require([
            'JBrowse/Model/Configuration/Schema'
        ], function( ConfigSchema ) {

describe( 'Configuration data model', function() {

  it( 'works when empty', function() {
          var schema = new ConfigSchema(
              {
                  slots: [
                      { name: 'foo.bar', type: 'string' },
                      { name: 'noggin.zee.zaz', type: 'integer' }
                  ]
              });
          var c = schema.newConfig();
          expect( c.get( 'foo.bar' ) ).toBe( undefined );
          expect( c.set( 'noggin.zee.zaz', 42 ) ).toEqual( 42 );
          expect( c.get( 'noggin.zee.zaz' ) ).toEqual( 42 );
          expect( JSON.stringify(c.exportLocal()) ).toEqual( '{"noggin":{"zee":{"zaz":42}}}' );
  });

  it( 'works with some simple test data', function() {
          var schema = new ConfigSchema(
              {
                  slots: [
                      { name: 'zonker', type: 'array' },
                      { name: 'zee', type: 'integer' },
                      { name: 'foo', type: 'string' },
                      { name: 'funcTest', type: 'string|function' },
                      { name: 'bar.baz', type: 'float' },
                      { name: 'bar.bee.quux', type: 'integer' }
                  ]
              });
          var c = schema.newConfig(
              {
                  zonker: [1,2,3],
                  zee: 1,
                  foo: "honk",
                  funcTest: function(ret) { return ret; },
                  bar: { baz: 1.1, bee: { quux: 42 } }
              });

          expect( c.get( 'zonker' ).length ).toEqual( 3 );
          expect( c.get( 'bar.baz' ) ).toEqual( 1.1 );
          expect( c.get( 'bar.bee.quux' ) ).toEqual( 42 );

          expect( JSON.stringify( c.exportLocal() ) ).toEqual('{}');

          c.set( 'bar.bee.quux', 74 );

          expect( JSON.stringify( c.exportLocal() ) ).toEqual('{"bar":{"bee":{"quux":74}}}');
          expect( c.get( 'bar.bee.quux' ) ).toEqual( 74 );
          expect( c.get( 'bar.baz' ) ).toEqual( 1.1 );

          expect( c.get('funcTest') ).toBe( undefined );
          expect( c.get('funcTest', [456] ) ).toEqual( 456 );

          var type_error;
          try {
              c.set( 'bar.baz', 'a string it should not accept' );
          } catch(e) {
              type_error = e;
          }

          expect( type_error+'' ).toContain( 'type' );
          expect( c.get('bar.baz') ).toEqual( 1.1 );
    });


  it( 'works with subconfigurations and multis', function() {
          var schema = new ConfigSchema(
              {
                  slots: [
                      { name: 'zonker', type: 'array' },
                      { name: 'sub1', type: 'SubConfiguration',
                        schema: { slots: [ { name: 'foo', type: 'integer' } ] }
                      },
                      { name: 'notset', type: 'float', defaultValue: 42.3 },
                      { name: 'multi1', type: 'multi-integer' },
                      { name: 'multisub', type: 'multi-subconfiguration',
                        schema: {
                            slots: [
                                {name: 'fog', type: 'string' },
                                {name: 'bar', type: 'integer', defaultValue: 20 },
                                {name: 'ziggy', type: 'string' }
                            ]
                        }
                      }
                  ]
              });
          var c = schema.newConfig(
              {
                  zonker: [1,2,3],
                  multi1: [4,5,6],
                  sub1: { foo: 3 },
                  multisub: [ { fog: 'zee' } ]
              });

          expect( c.get('zonker').length ).toEqual( 3 );
          expect( c.get('multi1').length ).toEqual( 3 );
          expect( c.get('sub1').get('foo') ).toEqual( 3 );
          expect( JSON.stringify(c.exportLocal()) ).toEqual('{}');
          expect( c.get('multisub')[0].get('fog') ).toEqual( 'zee' );
          expect( c.get('multisub')[0].get('ziggy') ).toBe( undefined );
          expect( c.get('multisub')[0].get('bar') ).toEqual( 20 );
          expect( c.get('multisub')[0].set('fog','zogger') ).toEqual( 'zogger' );

          var error;
          try {
              c.set('multi1',['foo',2]);
          } catch(e) {
              error = e;
          }

          expect( error+'' ).toContain('type');
          expect( c.get('multi1').length ).toEqual( 3 );
          expect( c.get('notset') ).toEqual( 42.3 );

    });

});
});