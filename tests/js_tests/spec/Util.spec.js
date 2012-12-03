require([
            'dojo/_base/array',
            'JBrowse/Util'
        ], function( array, Util ) {

describe( 'Util.basename', function() {

    array.forEach( [
                       [ [null], undefined ],
                       [ [{},'.baz'], undefined ],
                       [ ['bar.baz'], 'bar.baz' ],
                       [ ['foo/bar.baz'], 'bar.baz' ],
                       [ ['foo/bar.baz', '.baz' ], 'bar' ],
                       [ ['foo/bar.BAZ', '.baz' ], 'bar' ],
                       [ ['foo/bar.baz', '.BAZ' ], 'bar' ],
                       [ ['/noggin/boggin/' ], 'boggin' ],
                       [ ['/bee/boo/foo/bar.baz', '.BAZ' ], 'bar' ],
                       [ ['foo/barfbaz', '.baz' ], 'barfbaz' ],
                       [ ['foo\\barfbaz', '.baz' ], 'barfbaz' ],
                       [ ['foo\\bar.baz', '.baz' ], 'bar' ]
                   ],
                   function( testcase ) {
                       var input  = testcase[0];
                       var output = testcase[1];

                       it( JSON.stringify(input)+' -> '+JSON.stringify(output), function() {
                           expect( Util.basename.apply( Util, input ) ).toEqual( output );
                       });
    });
});

});