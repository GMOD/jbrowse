/**
 * Mixin for a store class that needs to load some remote stuff (or do
 * some other kind of asynchronous thing) before its features are
 * available through getFeatures,
 */

define(['dojo/_base/declare', 'dojo/Deferred'], function (declare, Deferred) {
  return declare(null, {
    // note that dojo.declare automatically chains constructors
    // without needing inherited()
    constructor: function (args) {
      this._deferFeatures()
    },

    /**
     * sets us up to defer calls to getFeatures().  calls will be
     * queued until the Deferred is resolved.
     */
    _deferFeatures: function () {
      if (!this._deferred) {
        this._deferred = {}
      }
      this._deferred.features = new Deferred()
    },

    /**
     * Runs calls to getFeatures through a Deferred that will queue
     * and aggregate feature requests until the Deferred is resolved.
     */
    getFeatures: function (query, featCallback, endCallback, errorCallback) {
      this._deferred.features.then(
        dojo.hitch(
          this,
          '_getFeatures',
          query,
          featCallback,
          endCallback,
          errorCallback,
        ),
        errorCallback,
      )
    },
  })
})
