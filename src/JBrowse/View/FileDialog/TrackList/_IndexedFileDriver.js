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
        if (!basename) {
          return false
        }

        // go through the configs and see if there is one for an index that seems to match
        for (var n in configs) {
          var c = configs[n]
          if (
            Util.basename(
              c[this.indexConfKey]
                ? c[this.indexConfKey].url || c[this.indexConfKey].blob.name
                : c[this.indexUrlConfKey],
              `.${this.indexExtension}`,
            ) == basename
          ) {
            // it's a match, put it in
            c[this.fileConfKey] = this._makeBlob(resource)
            return true
          }
        }
        // go through again and look for index files that don't have the base extension in them
        basename = Util.basename(basename, `.${this.fileExtension}`)
        for (var n in configs) {
          var c = configs[n]
          if (
            Util.basename(
              c[this.indexConfKey]
                ? c[this.indexConfKey].url || c[this.indexConfKey].blob.name
                : c[this.indexUrlConfKey],
              `.${this.indexExtension}`,
            ) == basename
          ) {
            // it's a match, put it in
            c[this.fileConfKey] = this._makeBlob(resource)
            return true
          }
        }

        // otherwise make a new store config for it
        var newName = `${this.name}_${basename}_${uniqCounter++}`
        configs[newName] = {
          type: this.storeType,
          name: newName,
          fileBasename: basename,
        }
        configs[newName][this.fileConfKey] = this._makeBlob(resource)

        return true
      } else if (resource.type == this.indexExtension) {
        var basename = Util.basename(
          resource.file ? resource.file.name : resource.url ? resource.url : '',
          `.${this.indexExtension}`,
        )
        if (!basename) {
          return false
        }

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
            c[this.indexConfKey] = this._makeBlob(resource)
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
              `.${this.fileExtension}`,
            ) == basename
          ) {
            // it's a match, put it in
            c[this.indexConfKey] = this._makeBlob(resource)
            return true
          }
        }

        // otherwise make a new store
        var newName = `${this.name}_${Util.basename(
          basename,
          `.${this.fileExtension}`,
        )}_${uniqCounter++}`
        configs[newName] = {
          name: newName,
          type: this.storeType,
        }

        configs[newName][this.indexConfKey] = this._makeBlob(resource)
        return true
      } else {
        return false
      }
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
          if (
            (conf[this.indexConfKey] || conf[this.indexUrlConfKey]) &&
            !(conf[this.fileConfKey] || conf[this.fileUrlConfKey])
          ) {
            // singleton Index
            singletonIndexCount++
            singletonIndexes[n] = conf
          } else if (
            (conf[this.fileConfKey] || conf[this.fileUrlConfKey]) &&
            !(conf[this.indexConfKey] || conf[this.indexUrlConfKey])
          ) {
            // singleton File
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
            if (singletonIndexes[indexName][this.indexUrlConfKey]) {
              singletonFiles[fileName][this.indexUrlConfKey] =
                singletonIndexes[indexName][this.indexUrlConfKey]
            }
            if (singletonIndexes[indexName][this.indexConfKey]) {
              singletonFiles[fileName][this.indexConfKey] =
                singletonIndexes[indexName][this.indexConfKey]
            }

            delete configs[indexName]
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
        if (!configs[fileName][this.fileUrlConfKey]) {
          delete configs[fileName]
        }
      }
    },

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
      return (
        (conf[this.fileConfKey] || conf[this.fileUrlConfKey]) &&
        (conf[this.indexConfKey] ||
          conf[this.indexUrlConfKey] ||
          conf[this.fileUrlConfKey])
      )
    },
  })
})
