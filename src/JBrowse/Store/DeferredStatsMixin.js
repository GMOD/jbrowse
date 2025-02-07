/**
 * Mixin for a store class that needs to load some remote stuff (or do
 * some other kind of asynchronous thing) before its stats are
 * available through getGlobalStats or getRegionStats.
 */

define(['dojo/_base/declare', 'dojo/Deferred', 'JBrowse/Util'], function (
  declare,
  Deferred,
  Util,
) {
  return declare(null, {
    // note that dojo.declare automatically chains constructors
    // without needing inherited()
    constructor: function (args) {
      this._deferGlobalStats()
    },

    /**
     * sets us up to defer calls to getGlobalStats().  calls will be
     * queued until the Deferred is resolved.
     */
    _deferGlobalStats: function () {
      if (!this._deferred) this._deferred = {}
      this._deferred.stats = new Deferred()
    },

    /**
     * Runs calls to getGlobalStats through a Deferred that will queue
     * and aggregate stats requests until the Deferred is resolved.
     */
    getGlobalStats: function (successCallback, errorCallback) {
      var thisB = this
      this._deferred.stats.then(
        dojo.hitch(this, '_getGlobalStats', successCallback, errorCallback),
        errorCallback,
      )
    },

    _getGlobalStats: function (successCallback, errorCallback) {
      successCallback(this.globalStats || {})
    },

    getRegionStats: function (query, successCallback, errorCallback) {
      var thisB = this
      this._deferred.stats.then(
        dojo.hitch(
          this,
          '_getRegionStats',
          query,
          successCallback,
          errorCallback,
        ),
        errorCallback,
      )
    },
  })
})
