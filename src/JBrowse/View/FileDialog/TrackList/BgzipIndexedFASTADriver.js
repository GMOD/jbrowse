define([
  'dojo/_base/declare',
  'JBrowse/Util',
  'JBrowse/Model/FileBlob',
  'JBrowse/Model/XHRBlob',
], function (declare, Util, FileBlob, XHRBlob) {
  var uniqCounter = 0
  return declare(null, {
    name: 'BGZFASTA',
    storeType: 'JBrowse/Store/SeqFeature/BgzipIndexedFasta',
    fileExtension: 'fasta.gz',
    fileExtensionMap: ['.fasta.gz', '.fa.gz', '.fna.gz', '.mfa.gz'],
    fileConfKey: 'bgzfa',
    fileUrlConfKey: 'urlTemplate',

    indexExtension: 'fasta.gz.fai',
    indexExtensionMap: [
      '.fasta.gz.fai',
      '.fa.gz.fai',
      '.fna.gz.fai',
      '.mfa.gz.fai',
    ],
    indexConfKey: 'fai',
    indexUrlConfKey: 'faiUrlTemplate',

    doubleIndexExtension: 'gzi',
    doubleIndexExtensionMap: [
      '.fasta.gz.gzi',
      '.fa.gz.gzi',
      '.fna.gz.gzi',
      '.mfa.gz.gzi',
    ],
    doubleIndexConfKey: 'gzi',
    doubleIndexUrlConfKey: 'gziUrlTemplate',

    tryResource: function (configs, resource) {
      if (resource.type == this.fileExtension) {
        var basename = Util.basename(
          resource.file ? resource.file.name : resource.url ? resource.url : '',
          this.fileExtensionMap,
        )
        if (!basename) return false

        // go through the configs and see if there is one for an index that seems to match
        for (var n in configs) {
          var c = configs[n]
          if (
            Util.basename(
              c[this.indexConfKey]
                ? c[this.indexConfKey].url || c[this.indexConfKey].blob.name
                : c[this.indexUrlConfKey],
              this.indexExtensionMap,
            ) == basename ||
            Util.basename(
              c[this.doubleIndexConfKey]
                ? c[this.doubleIndexConfKey].url ||
                    c[this.doubleIndexConfKey].blob.name
                : c[this.doubleIndexUrlConfKey],
              this.doubleIndexExtensionMap,
            ) == basename
          ) {
            // it's a match, put it in
            c[this.fileConfKey] = this._makeBlob(resource)
            return true
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
      } else if (resource.type == this.indexExtension) {
        var basename = Util.basename(
          resource.file ? resource.file.name : resource.url ? resource.url : '',
          this.indexExtensionMap,
        )
        if (!basename) return false

        for (var n in configs) {
          var c = configs[n]
          if (
            Util.basename(
              c[this.fileConfKey]
                ? c[this.fileConfKey].url || c[this.fileConfKey].blob.name
                : c[this.fileConfKey],
              this.fileExtensionMap,
            ) == basename ||
            Util.basename(
              c[this.doubleIndexConfKey]
                ? c[this.doubleIndexConfKey].url ||
                    c[this.doubleIndexConfKey].blob.name
                : c[this.doubleIndexUrlConfKey],
              this.doubleIndexExtensionMap,
            ) == basename
          ) {
            // it's a match, put it in
            c[this.indexConfKey] = this._makeBlob(resource)
            return true
          }
        }

        // otherwise make a new store
        var newName =
          this.name +
          '_' +
          Util.basename(basename, '.' + this.fileExtension) +
          '_' +
          uniqCounter++
        configs[newName] = {
          name: newName,
          type: this.storeType,
        }

        configs[newName][this.indexConfKey] = this._makeBlob(resource)
        return true
      } else if (resource.type == this.doubleIndexExtension) {
        var basename = Util.basename(
          resource.file ? resource.file.name : resource.url ? resource.url : '',
          this.doubleIndexExtensionMap,
        )
        if (!basename) return false

        for (var n in configs) {
          var c = configs[n]
          if (
            Util.basename(
              c[this.fileConfKey]
                ? c[this.fileConfKey].url || c[this.fileConfKey].blob.name
                : c[this.fileConfKey],
              this.fileExtensionMap,
            ) == basename ||
            Util.basename(
              c[this.indexConfKey]
                ? c[this.indexConfKey].url || c[this.indexConfKey].blob.name
                : c[this.indexUrlConfKey],
              this.indexExtensionMap,
            ) == basename
          ) {
            // it's a match, put it in
            c[this.doubleIndexConfKey] = this._makeBlob(resource)
            return true
          }
        }

        // otherwise make a new store
        var newName =
          this.name +
          '_' +
          Util.basename(basename, '.' + this.fileExtension) +
          '_' +
          uniqCounter++
        configs[newName] = {
          name: newName,
          type: this.storeType,
        }

        configs[newName][this.doubleIndexConfKey] = this._makeBlob(resource)
        return true
      } else return false
    },

    // try to merge any singleton file and index stores.  currently can only do this if there is one of each
    finalizeConfiguration: function (configs) {
      for (var n in configs) {
        var conf = configs[n]
        if (conf.type === this.storeType) {
          var v1 = conf[this.indexConfKey] || conf[this.indexUrlConfKey]
          var v2 = conf[this.fileConfKey] || conf[this.fileUrlConfKey]
          var v3 =
            conf[this.doubleIndexConfKey] || conf[this.doubleIndexUrlConfKey]
          if (!(v1 && v2 && v3)) {
            delete configs[n]
          }
        }
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
      return (
        (conf[this.fileConfKey] || conf[this.fileUrlConfKey]) &&
        (conf[this.indexConfKey] || conf[this.indexUrlConfKey]) &&
        (conf[this.doubleIndexConfKey] || conf[this.doubleIndexUrlConfKey])
      )
    },
  })
})
