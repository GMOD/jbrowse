/*
 * Extended Neat Features Plugin
 * Draws introns and paints gradient subfeatures.
 */

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/dom-construct',
  'dojo/query',
  'JBrowse/Plugin',
], function (declare, lang, Deferred, domConstruct, query, JBrowsePlugin) {
  return declare(JBrowsePlugin, {
    constructor: function (args) {
      console.log('plugin: NeatHTMLFeatures')
      var thisB = this
      var browser = this.browser
    },
  })
})
