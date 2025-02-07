define([
  'dojo/_base/declare',
  'JBrowse/Util',
  'JBrowse/Model/FileBlob',
  'JBrowse/Model/XHRBlob',
], function (declare, Util, FileBlob, XHRBlob) {
  var uniqCounter = 0
  return declare(null, {
    tryResource: function (configs, resource) {
      if (resource.type == this.fileExtension) {
        var basename = Util.basename(
          resource.file ? resource.file.name : resource.url ? resource.url : '',
        )
        if (!basename) return false

        // go through the configs and see if there is one for an index that seems to match
        for (var n in configs) {
          var c = configs[n]
          for (const m in this.indexTypes) {
            var index = this.indexTypes[m]
            if (
              Util.basename(
                c[index.indexConfKey]
                  ? c[index.indexConfKey].url || c[index.indexConfKey].blob.name
                  : c[index.indexUrlConfKey],
                index.indexExtensionMap || '.' + index.indexExtension,
              ) == basename
            ) {
              // it's a match, put it in
              c[this.fileConfKey] = this._makeBlob(resource)
              return true
            }
          }
        }
        // go through again and look for index files that don't have the base extension in them
        basename = Util.basename(
          basename,
          this.fileExtensionMap || '.' + this.fileExtension,
        )
        for (var n in configs) {
          var c = configs[n]
          for (const m in this.indexTypes) {
            var index = this.indexTypes[m]
            if (
              Util.basename(
                c[index.indexConfKey]
                  ? c[index.indexConfKey].url || c[index.indexConfKey].blob.name
                  : c[index.indexUrlConfKey],
                index.indexExtensionMap || '.' + index.indexExtension,
              ) == basename
            ) {
              // it's a match, put it in
              c[this.fileConfKey] = this._makeBlob(resource)
              return true
            }
          }
        }

        // otherwise make a new store config for it
        var newName = this.name + '_' + basename + '_' + uniqCounter++
        configs[newName] = {
          type: this.storeType,
          name: newName,
          fileBasename: basename,
        }
        configs[newName][this.fileConfKey] = this._makeBlob(resource)

        return true
      } else {
        for (const m in this.indexTypes) {
          var index = this.indexTypes[m]
          if (resource.type == index.indexExtension) {
            var basename = Util.basename(
              resource.file
                ? resource.file.name
                : resource.url
                  ? resource.url
                  : '',
              index.indexExtensionMap || '.' + index.indexExtension,
            )
            if (!basename) return false

            // go through the configs and look for data files that match like zee.bam -> zee.bam.bai
            for (var n in configs) {
              var c = configs[n]
              if (
                Util.basename(
                  c[this.fileConfKey]
                    ? c[this.fileConfKey].url || c[this.fileConfKey].blob.name
                    : c[this.fileUrlConfKey],
                ) == basename
              ) {
                // it's a match, put it in
                c[index.indexConfKey] = this._makeBlob(resource)
                return true
              }
            }
            // go through again and look for data files that match like zee.bam -> zee.bai
            for (var n in configs) {
              var c = configs[n]
              if (
                Util.basename(
                  c[this.fileConfKey]
                    ? c[this.fileConfKey].url || c[this.fileConfKey].blob.name
                    : c[this.fileUrlConfKey],
                  this.fileExtensionMap || '.' + this.fileExtension,
                ) == basename
              ) {
                // it's a match, put it in
                c[index.indexConfKey] = this._makeBlob(resource)
                return true
              }
            }

            // otherwise make a new store
            var newName =
              this.name +
              '_' +
              Util.basename(
                basename,
                this.fileExtensionMap || '.' + this.fileExtension,
              ) +
              '_' +
              uniqCounter++
            configs[newName] = {
              name: newName,
              type: this.storeType,
            }

            configs[newName][index.indexConfKey] = this._makeBlob(resource)
            return true
          }
        }
      }
      return false
    },

    // try to merge any singleton file and index stores.  currently can only do this if there is one of each
    finalizeConfiguration: function (configs) {
      var singletonIndexes = {}
      var singletonIndexCount = 0
      var singletonFiles = {}
      var singletonFileCount = 0
      for (var n in configs) {
        var conf = configs[n]
        if (conf.type === this.storeType) {
          var flag = false
          for (const m in this.indexTypes) {
            const index = this.indexTypes[m]
            flag |= !!(conf[index.indexConfKey] || conf[index.indexUrlConfKey])
          }
          if (flag && !(conf[this.fileConfKey] || conf[this.fileUrlConfKey])) {
            singletonIndexCount++
            singletonIndexes[n] = conf
          }

          flag = true
          for (const m in this.indexTypes) {
            const index = this.indexTypes[m]
            flag &= !(conf[index.indexConfKey] || conf[index.indexUrlConfKey])
          }
          if (flag && !!(conf[this.fileConfKey] || conf[this.fileUrlConfKey])) {
            singletonFileCount++
            singletonFiles[n] = conf
          }
        }
      }

      // if we have a single File and single Index left at the end,
      // stick them together and we'll see what happens
      if (singletonFileCount == 1 && singletonIndexCount == 1) {
        for (var indexName in singletonIndexes) {
          for (var fileName in singletonFiles) {
            for (const m in this.indexTypes) {
              const index = this.indexTypes[m]
              if (singletonIndexes[indexName][index.indexUrlConfKey])
                singletonFiles[fileName][index.indexUrlConfKey] =
                  singletonIndexes[indexName][index.indexUrlConfKey]
              if (singletonIndexes[indexName][index.indexConfKey])
                singletonFiles[fileName][index.indexConfKey] =
                  singletonIndexes[indexName][index.indexConfKey]

              delete configs[indexName]
            }
          }
        }
      }

      // delete any remaining singleton Indexes, since they don't have
      // a hope of working
      for (var indexName in singletonIndexes) {
        delete configs[indexName]
      }

      // delete any remaining singleton Files, unless they are URLs
      for (var fileName in singletonFiles) {
        if (!configs[fileName][this.fileUrlConfKey]) delete configs[fileName]
      }
    },

    _makeBlob: function (resource) {
      var r = resource.file
        ? new FileBlob(resource.file)
        : resource.url
          ? new XHRBlob(resource.url)
          : null
      if (!r) throw 'unknown resource type'
      return r
    },

    confIsValid: function (conf) {
      var valid = false
      for (var m in this.indexTypes) {
        var index = this.indexTypes[m]
        valid |=
          (conf[this.fileConfKey] || conf[this.fileUrlConfKey]) &&
          (conf[index.indexConfKey] ||
            conf[index.indexUrlConfKey] ||
            conf[this.fileUrlConfKey])
      }
      return valid
    },
  })
})
