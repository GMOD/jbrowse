define([
           'dojo/_base/declare',
           './CanvasFeatures'
       ],
       function(
           declare,
           CanvasFeatures
       ) {

return declare([ CanvasFeatures ], {
  configSchema: {
      slots: [{name: 'displayMode', defaultValue: 'collapsed', type: 'string'}]
  }
});
});
