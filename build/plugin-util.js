const path = require('path')
const fs = require('fs')
const glob = require('glob')

// fetch the "jbrowsePlugin" section from pluginDir/package.json
// if present. returns empty object if not present
function _getPackageDefinitionPluginSection(pluginDir) {
   let packageDefFile = path.resolve(pluginDir,'package.json')
   if (fs.existsSync(packageDefFile)) {
       let packageDef = require(packageDefFile)
       if (packageDef.jbrowsePlugin) {
           return packageDef.jbrowsePlugin
       }
   }

   return {}
}

// get the plugin configuration for the given plugin dir by reading the plugin's
// package.json and applying defaults for any missing keys
function getPluginConfig(pluginDir,baseDir='.') {
    let pluginDef = _getPackageDefinitionPluginSection(pluginDir)

    let defaultConfig = {
        name: path.basename(pluginDir).replace(/-jbrowse-plugin\/?/,''),
        css: 'css',
        js: 'js',
        location: path.relative(baseDir,path.resolve(pluginDir,'js')),
        pluginDir: path.relative(baseDir,pluginDir)
    }

    let config = Object.assign(defaultConfig,pluginDef)

    return config
}

function findPluginDirectories(baseDir) {
    return glob.sync(path.resolve(baseDir,'plugins/*/'))
        .concat(
            glob.sync(path.resolve(baseDir,'node_modules/*-jbrowse-plugin/'))
        )
        .concat(
            glob.sync(path.resolve(baseDir,'node_modules/@*/*-jbrowse-plugin/'))
        )
}

module.exports = {
    getPluginConfig,
    findPluginDirectories,
}
