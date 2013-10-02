define([
           'dojo/_base/declare',
           './Box'
       ],
       function(
           declare,
           BoxGlyph
       ) {

return declare([ BoxGlyph, FeatureLabelMixin ], {
  configSchema: {
      slots: [
          { name: 'color', defaultValue: function(feature) { return feature.get('gieStain') == 'foo' ? 'black' : 'gray'; } }
        ]
  }
});
});
