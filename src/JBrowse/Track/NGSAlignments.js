define([
           'dojo/_base/declare',

           '../Track'
       ],
       function(
           declare,
           Track
       ) {
return declare( Track, {

  configSchema: {
    slots: [
      { name: 'viewName', type: 'string',  required: true,
        description: 'String name of the view to use.  Usually a function.'
      }
    ]
  },


});
});
