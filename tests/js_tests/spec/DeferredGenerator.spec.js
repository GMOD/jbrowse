require([
            'dojo/Deferred',
            'JBrowse/Util/DeferredGenerator'
        ], function( Deferred, DeferredGenerator ) {

describe('deferred generator', function() {

   it('works in a basic way', function() {
          var root = new DeferredGenerator( function( d ) {
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

          expect( root.isFulfilled() ).toBeFalsy();
          expect( root.isRejected() ).toBeFalsy();
          expect( root.isResolved() ).toBeFalsy();

          var d = root.each( function(i) { return i*2; }, function() { done += 'one'; } )
           .each( function(i) { return i+1; }, function() { done += 'two'; } )
           .each( function(i) { items.push(i); }, function() { done += 'three'; } )
           .then( function()  { done += 'four'; } )
           .run();
          waitsFor( function() { return done; }, 800 );
          runs( function() {
                    expect( items[0] ).toEqual( 3 );
                    expect( items[1] ).toEqual( 5 );
                    expect( items[2] ).toEqual( 7 );
                    expect( items[3] ).toEqual( 9 );
                    expect( items.length ).toEqual( 4 );
                    expect( done ).toEqual('onetwothreefour');

                    expect( d.isFulfilled() ).toBeTruthy();
                    expect( d.isRejected() ).toBeFalsy();
                    expect( d.isResolved() ).toBeTruthy();
          });
   });

   it('detects multiple attempts to start network', function() {
          var root = new DeferredGenerator( function( d ) {
              window.setTimeout( function() {
                                     d.emit( 1 );
                                     d.emit( 2 );
                                     d.resolve();
                                 }, 200 );
          });
          var items = [];
          var done;
          var d = root.each( function(i) { return i*2; } )
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
          d.run();
          var d2error;
          try {
              d2.run();
          } catch( e ) {
              d2error=e;
          }
          waitsFor( function() { return done; }, 800 );
          runs( function() {
                    expect( items[0] ).toEqual( 3 );
                    expect( items[1] ).toEqual( 5 );
                    expect( items.length ).toEqual( 2 );

                    expect( d2ran ).toBeTruthy();
                    expect( d2error ).toMatch( /started/ );
          });
   });

   it('supports returning Deferred* from end callbacks', function() {
          var canceled;
          var root = new DeferredGenerator(
              function( d ) {
                  window.setTimeout( function() {
                                         d.emit( 1 );
                                         d.emit( 2 );
                                         d.emit( 3 );
                                         window.setTimeout(function() {
                                                               d.emit( 4 );
                                                               d.resolve();
                                                           }, 200 );
                                     }, 200 );
              },
              function(reason) { canceled = reason; }
          );
          expect( canceled ).toBeFalsy();

          var items = [];
          var done;
          var endString = '';
          root.each( function(i) { return i*2; },
                  function() {
                      var d = new Deferred();
                      window.setTimeout( function() { endString += 'one'; d.resolve(); }, 200 );
                      return d;
                  })
           .each( function(i) { return i+1; }, function() { endString += 'two'; } )
           .each( function(i) { items.push(i); }, function() {
                      var d = new Deferred();
                      window.setTimeout( function() { endString += 'three'; d.resolve(); }, 200 );
                      return d;
                  })
           .then( function()  { endString += 'four'; done = true; } )
           .run();
          waitsFor( function() { return done; }, 800 );
          runs( function() {
                    expect( items[0] ).toEqual( 3 );
                    expect( items[1] ).toEqual( 5 );
                    expect( items[2] ).toEqual( 7 );
                    expect( items[3] ).toEqual( 9 );
                    expect( items.length ).toEqual( 4 );
                    expect( endString ).toEqual('onetwothreefour');
                    expect( canceled ).toBeFalsy();
          });
   });

});
});