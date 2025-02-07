define(['dojo/_base/declare', 'dojo/_base/lang'], function (declare, lang) {
  return declare(null, {
    // get the label string for a feature, based on the setting
    // of this.config.label
    getFeatureLabel: function (feature) {
      return this._getFeatureDescriptiveThing('label', 'name,id', feature)
    },

    // get the description string for a feature, based on the setting
    // of this.config.description
    getFeatureDescription: function (feature) {
      return this._getFeatureDescriptiveThing(
        'description',
        'note,description',
        feature,
      )
    },

    _getFeatureDescriptiveThing: function (field, defaultFields, feature) {
      var dConf = this.config.style[field] || this.config[field]

      if (!dConf) {
        return null
      }

      // if the description is a function, just call it
      if (typeof dConf == 'function') {
        return dConf.call(this, feature)
      }
      // otherwise try to parse it as a field list
      else {
        if (!this.descriptionFields) {
          this.descriptionFields = {}
        }

        // parse our description varname conf if necessary
        var fields =
          this.descriptionFields[field] ||
          function () {
            var f = dConf
            if (f) {
              if (lang.isArray(f)) {
                f = f.join(',')
              } else if (typeof f != 'string') {
                console.warn(
                  'invalid `description` setting (' +
                    f +
                    ') for "' +
                    (this.name || this.track.name) +
                    '" track, falling back to "note,description"',
                )
                f = defaultFields
              }
              f = f.toLowerCase().split(/\s*\,\s*/)
            } else {
              f = []
            }
            this.descriptionFields[field] = f
            return f
          }.call(this)

        // return the value of the first field that contains something
        for (var i = 0; i < fields.length; i++) {
          var d = feature.get(fields[i])
          if (d) {
            return d
          }
        }
        return null
      }
    },
  })
})
