define([
  'dojo/_base/declare',
  'JBrowse/Util',
  './_IndexedFileDriver',
], function (declare, Util, _IndexedFileDriver) {
  return declare(_IndexedFileDriver, {
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
            if (singletonIndexes[indexName][this.indexUrlConfKey])
              singletonFiles[fileName][this.indexUrlConfKey] =
                singletonIndexes[indexName][this.indexUrlConfKey]
            if (singletonIndexes[indexName][this.indexConfKey])
              singletonFiles[fileName][this.indexConfKey] =
                singletonIndexes[indexName][this.indexConfKey]

            delete configs[indexName]
          }
        }
      }

      // delete any remaining singleton Indexes, since they don't have
      // a hope of working
      for (var indexName in singletonIndexes) {
        delete configs[indexName]
      }

      // make any remaining singleton data files be unindexed stores
      for (var fileName in singletonFiles) {
        configs[fileName].type = this.unindexedStoreType
      }
    },

    confIsValid: function (conf) {
      return conf[this.fileConfKey] || conf[this.fileUrlConfKey]
    },
  })
})
