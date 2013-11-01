define( [
            'dojo/_base/lang',
            'dojo/promise/all',
            'dojo/when',

            '../DeferredGenerator'
        ],
        function(
            lang,
            all,
            when,

            DeferredGenerator
        ) {

return {

   // combine an array of DeferredGenerators into a single
   // DeferredGenerator that emits the stuff from all of them
   combine: function( inputGenerators ) {
       if( lang.isArray( inputGenerators ) && inputGenerators.length <= 1 )
           return inputGenerators[0];

       return new DeferredGenerator(
           function( generator ) {
               when( inputGenerators,
                     function( inputGenerators ) {
                         var running = [];
                         for( var i = 0; i<inputGenerators.length; i++ ) {
                             running.push(
                                 inputGenerators[i].forEach(
                                     function(val) {
                                         generator.emit(val);
                                     })
                             );
                         }
                         all( running )
                             .then( function( vals ) {
                                        generator.resolve( vals );
                                    },
                                    function( error ) {
                                        generator.reject(error);
                                    });
                     });
           },
           function( cancelReason ) {
               for( var i = 0; i<inputGenerators.length; i++ ) {
                       inputGenerators[i].cancel( cancelReason );
               }
           });
   }
};
});