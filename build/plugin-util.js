const path = require('path')
const fs = require('fs')

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
function getPluginConfig(pluginDir) {

    let pluginDef = _getPackageDefinitionPluginSection(pluginDir)

    let defaultConfig = {
        name: path.basename(pluginDir).replace(/-jbrowse-plugin\/?/,''),
        css: 'css',
        js: 'js',
        location: pluginDir+'js',
        pluginDir
    }

    let config = Object.assign(defaultConfig,pluginDef)

    return config
}

module.exports = {
    getPluginConfig,
}
