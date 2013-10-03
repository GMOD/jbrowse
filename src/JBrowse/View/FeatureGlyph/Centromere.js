define([
           'dojo/_base/declare',
           './Box'
       ],
       function(
           declare,
           BoxGlyph
       ) {

return declare([ BoxGlyph ], {
  configSchema: {
      slots: [
          { name: 'color', defaultValue: '#8B2323', type: 'Color'},
          { name: 'height', defaultValue: 30, type: 'float' },
          { name: 'borderColor', defaultValue: 'black', type: 'Color' },
          { name: 'borderWidth', defaultValue: 1, type: 'float' }
      ]
  }
});
});
