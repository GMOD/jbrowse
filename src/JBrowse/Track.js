define(['dojo/_base/declare', 'JBrowse/Component'], function (
  declare,
  Component,
) {
  return declare(Component, {
    /**
     * Returns object holding the default configuration for this track
     * type.  Might want to override in subclasses.
     * @private
     */
    configSchema: {
      slots: [
        {
          name: 'maxFeatureSizeForUnderlyingRefSeq',
          type: 'integer',
          defaultValue: 250000,
        },
        { name: 'pinned', type: 'boolean', defaultValue: false },
        { name: 'metadata', type: 'object', defaultValue: {} },
        { name: 'style.trackLabelCss', type: 'string' },
        { name: 'label', type: 'string' },
        {
          name: 'query',
          type: 'object',
          defaultValue: {},
          shortDesc: 'track-specific query variables to pass to the store',
        },
        {
          name: 'store',
          type: 'string|object',
          shortDesc: 'the name of the store to use with this track',
        },
        {
          name: 'type',
          type: 'string',
          shortDesc: 'the JavaScript type of this track',
        },
      ],
    },
  })
})
