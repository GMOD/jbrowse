const { findPlugins } = require('./plugin-util')

module.exports = function (env) {
  dojoConfig = {
    baseUrl: '.',
    packages: [
      {
        name: 'dojo',
        location: env.dojoRoot + 'dojo',
      },
      {
        name: 'dijit',
        location: env.dojoRoot + 'dijit',
      },
      {
        name: 'dojox',
        location: env.dojoRoot + 'dojox',
      },
      {
        name: 'JBrowse',
        location: 'src/JBrowse',
        lib: '.',
      },
      {
        name: 'dgrid',
        location: env.dojoRoot + 'dgrid',
        lib: '.',
      },
      {
        name: 'dstore',
        location: env.dojoRoot + 'dojo-dstore',
        lib: '.',
      },
      {
        name: 'FileSaver',
        location: env.dojoRoot + 'filesaver.js',
        lib: '.',
      },
    ].concat(findPlugins('.')),
    async: true,
  }

  return dojoConfig
}
