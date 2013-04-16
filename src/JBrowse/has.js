define([ 'dojo/has' ],
       function( has ) {

           // add some detection routines to dojo/has for typed arrays and canvas
           has.add( 'typed-arrays', function() {
                        try {
                            return !! Uint8Array;
                        } catch(e) {};
                        return false;
                    });

           has.add( 'canvas', function() {
                        try {
                            return !! document.createElement('canvas');
                        } catch(e) {}
                        return false;
                    });
           return has;
       }
);