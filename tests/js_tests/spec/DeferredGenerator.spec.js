require([
            'dojo/Deferred',
            'JBrowse/Util/DeferredGenerator'
        ], function( Deferred, DeferredGenerator ) {

describe('deferred generator', function() {

   it('works in a basic way', function() {
          var d = new DeferredGenerator();
          d.generator( function( d ) {
              window.setTimeout( function() {
                                     d.emit( 1 );
                                     d.emit( 2 );
                                     d.emit( 3 );
                                     window.setTimeout(function() {
                                                           d.emit( 4 );
                                                           d.resolve();
                                                       }, 200 );
                                 }, 200 );
          });
          var items = [];
          var done = '';
          d.each( function(i) { return i*2; }, function() { done += 'one'; } )
           .each( function(i) { return i+1; }, function() { done += 'two'; } )
           .each( function(i) { items.push(i); }, function() { done += 'three'; } )
           .then( function()  { done += 'four'; } )
           .start();
          waitsFor( function() { return done; }, 800 );
          runs( function() {
                    expect( items[0] ).toEqual( 3 );
                    expect( items[1] ).toEqual( 5 );
                    expect( items[2] ).toEqual( 7 );
                    expect( items[3] ).toEqual( 9 );
                    expect( items.length ).toEqual( 4 );
                    expect( done ).toEqual('onetwothreefour');
          });
   });

   it('detects branching chains', function() {
          var d = new DeferredGenerator();
          d.generator( function( d ) {
              window.setTimeout( function() {
                                     d.emit( 1 );
                                     d.emit( 2 );
                                     d.resolve();
                                 }, 200 );
          });
          var items = [];
          var done;
          d = d.each( function(i) { return i*2; } )
              .each( function(i) { return i+1; } )
              .each( function(i) { items.push(i); },
                     function() { done = true; } );

          var d2ran;
          var d2 = d.each(
              function(i) { return i*3; },
              function() {
                  d2ran = true;
              }
          );
          d.start();
          var d2error;
          try {
              d2.start();
          } catch( e ) {
              d2error=e;
          }
          waitsFor( function() { return done; }, 800 );
          runs( function() {
                    expect( items[0] ).toEqual( 3 );
                    expect( items[1] ).toEqual( 5 );
                    expect( items.length ).toEqual( 2 );

                    expect( d2ran ).toBeFalsy();
                    expect( d2error ).toMatch( /started/ );
          });
   });

   it('supports returning Deferreds or DeferredGenerators from end callbacks', function() {
          var d = new DeferredGenerator();
          d.generator( function( d ) {
              window.setTimeout( function() {
                                     d.emit( 1 );
                                     d.emit( 2 );
                                     d.emit( 3 );
                                     window.setTimeout(function() {
                                                           d.emit( 4 );
                                                           d.resolve();
                                                       }, 200 );
                                 }, 200 );
          });
          var items = [];
          var done;
          var endString = '';
          d.each( function(i) { return i*2; }, function() { endString += 'one'; } )
           .each( function(i) { return i+1; }, function() { endString += 'two'; } )
           .each( function(i) { items.push(i); }, function() {
                      var d = new Deferred();
                      window.setTimeout( function() { endString += 'three'; d.resolve(); }, 200 );
                      return d;
                  })
           .then( function()  { endString += 'four'; done = true; } )
           .start();
          waitsFor( function() { return done; }, 800 );
          runs( function() {
                    expect( items[0] ).toEqual( 3 );
                    expect( items[1] ).toEqual( 5 );
                    expect( items[2] ).toEqual( 7 );
                    expect( items[3] ).toEqual( 9 );
                    expect( items.length ).toEqual( 4 );
                    expect( endString ).toEqual('onetwothreefour');
          });
   });

});
});