define([
  'dojo/_base/declare',
  'JBrowse/Util',
  'JBrowse/Model/FileBlob',
  'JBrowse/Model/XHRBlob',
], function (declare, Util, FileBlob, XHRBlob) {
  var uniqCounter = 0
  return declare(null, {
    storeType: 'JBrowse/Store/SeqFeature/TwoBit',

    tryResource: function (configs, resource) {
      if (resource.type == '2bit') {
        var basename = Util.basename(
          resource.file ? resource.file.name : resource.url ? resource.url : '',
          ['.2bit'],
        )
        if (!basename) {
          return false
        }

        var newName = 'TwoBit_' + basename + '_' + uniqCounter++
        configs[newName] = {
          fileBasename: basename,
          type: this.storeType,
          blob: this._makeBlob(resource),
          name: newName,
        }
        return true
      } else {
        return false
      }
    },

    // try to merge any singleton BAM and BAI stores.  currently can only do this if there is one of each
    finalizeConfiguration: function (configs) {},

    _makeBlob: function (resource) {
      var r = resource.file
        ? new FileBlob(resource.file)
        : resource.url
          ? new XHRBlob(resource.url)
          : null
      if (!r) {
        throw 'unknown resource type'
      }
      return r
    },

    confIsValid: function (conf) {
      return conf.blob || conf.urlTemplate
    },
  })
})
