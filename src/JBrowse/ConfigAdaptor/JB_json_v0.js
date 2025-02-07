define(['dojo/_base/declare', 'JBrowse/ConfigAdaptor/JB_json_v1'], function (
  declare,
  JB_json_v1,
) {
  return declare(
    'JBrowse.ConfigAdaptor.JB_json_v0',
    JB_json_v1,

    /**
     * @lends JBrowse.ConfigAdaptor.JB_json_v0.prototype
     */
    {
      /**
       * Configuration adaptor for JBrowse JSON version 0
       * <code>trackInfo.js</code> files.
       * @constructs
       * @extends JBrowse.ConfigAdaptor.JB_json_v1
       */
      constructor: function () {},

      /**
       * Munge the v0 configuration to conform to v1.
       *
       * @param {Object} o the object containing the configuration, which it
       *                   modifies in-place
       * @param {Object} load_args the arguments that were passed to <code>load()</code>
       * @returns {Object} v1-compliant configuration
       */
      regularize_conf: function (o, load_args) {
        // transform Ye Olde Confige to conform to format version 1
        o = { tracks: o }
        dojo.forEach(o.tracks, function (trackdef) {
          if ('url' in trackdef) {
            trackdef.urlTemplate = trackdef.url
            //trackdef.urlTemplate = trackdef.url.replace(/\{refseq\}\/([^/]+)/, "$1/{refseq}");
            delete trackdef.url

            // TODO: this backendVersion thing is a stopgap until we
            // refactor far enough to have real pluggable datasources
            trackdef.backendVersion = 0
          }
        })

        return this.inherited(arguments, [o, load_args])
      },

      /**
       * Parse the trackInfo.js configuration text into JSON.
       *
       * @param {String} conf_text the text in the conf file
       * @returns {Object} parsed JSON
       */
      parse_conf: function (conf_text) {
        conf_text.replace(/^[^\{]+/, '')
        return this.inherited(arguments, [conf_text])
      },
    },
  )
})
