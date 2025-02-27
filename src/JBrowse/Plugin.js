define(['dojo/_base/declare', 'JBrowse/Component'], function (
  declare,
  Component,
) {
  return declare(Component, {
    constructor: function (args) {
      this.name = args.name
      this.cssLoaded = args.cssLoaded
      this._finalizeConfig(args.config)
    },

    _defaultConfig: function () {
      return {
        baseUrl: `/plugins/${this.name}`,
      }
    },
  })
})
