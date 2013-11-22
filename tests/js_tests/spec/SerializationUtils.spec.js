require([
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/_base/declare',
            'dojo/json',

            'JBrowse/Util/Serialization',

            'JBrowseTest/TestClass1'
        ], function(
            array,
            lang,
            declare,
            JSON,

            SUtils,

            TestClass1
        ) {

function expectDeepEqual( func, input, output ) {
    it( JSON.stringify(input)+' -> '+JSON.stringify(output), function() {
            var out;
            func.apply( SUtils, input ).then( function(o){ out = o; });
            waitsFor( function() { return out; });
            runs(function() {
                     expect( out ).toEqual( output );
                 });
        });
}


describe( 'SerializationUtils.inflateObjects', function() {
    expectDeepEqual( SUtils.inflate, [{ foo: 'bar', zee: {bee: 1} }], { foo: 'bar', zee: {bee: 1} } );

    var testObject = new TestClass1(
        { zonker: 'zee',
          innerObjects: [
              new TestClass1({ foo: 1 }),
              new TestClass1({ zink: 2 }),
              new TestClass1({ higgins: true, nonk: { zee: 'zoz' }})
          ]
        });

    var json1;
    it( 'serializes test object 1', function() {
        expect( json1 = SUtils.serialize( testObject ) )
            .toEqual('{"$class":"JBrowseTest/TestClass1","zonker":"zee","innerObjects":[{"$class":"JBrowseTest/TestClass1","foo":1},{"$class":"JBrowseTest/TestClass1","zink":2},{"$class":"JBrowseTest/TestClass1","higgins":true,"nonk":{"zee":"zoz"}}]}');
    });

    it( 'deserializes test object 1', function() {
        var testObjectClone;
        SUtils.deserialize( json1 ).then( function( d ) { testObjectClone = d; });
        waitsFor( function() { return testObjectClone; });
        runs( function() {
            expect( JSON.stringify( testObjectClone ) ).toNotMatch(/"\$class":/);

            // test the full round trip
            var json2 = SUtils.serialize( testObjectClone );
            expect( json2 ).toEqual( json1 );
        });
    });
});
});