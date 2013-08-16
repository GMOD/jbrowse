define( [
            'dojo/_base/declare',
            'dojo/_base/lang'
        ],
        function(
            declare,
            lang
        ) {

return declare( null, {

    // get the label string for a feature, based on the setting
    // of this.config.label
    getFeatureLabel: function( feature ) {
        return this.getConfForFeature('featureLabel', feature );
    },

    configSchema: {
        slots: [
                { name: 'featureLabel', type: 'string', defaultValue: function( feature, path, glyph, track ) {
                      var fields = track.getConfForFeature( 'featureLabelFields', feature );
                      for( var i = 0; i<fields.length; i++ ) {
                          var v = feature.get(fields[i]);
                          if( v !== undefined )
                              return v;
                      }
                      return undefined;
                  }
                },
                { name: 'featureLabelFields', type: 'multi-string', defaultValue: [ 'name', 'id' ] },

                { name: 'featureDescription', type: 'string', defaultValue: function( feature, path, glyph, track ) {
                      var fields = track.getConfForFeature( 'featureDescriptionFields', feature );
                      for( var i = 0; i<fields.length; i++ ) {
                          var v = feature.get(fields[i]);
                          if( v !== undefined )
                              return v;
                      }
                      return undefined;
                  }
                },
                { name: 'featureDescriptionFields', type: 'multi-string', defaultValue: [ 'note','description' ] }

        ]
    },

    // get the description string for a feature, based on the setting
    // of this.config.description
    getFeatureDescription: function( feature ) {
        return this.getConfForFeature( 'featureDescription', feature );
    }
});
});