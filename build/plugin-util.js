const path = require('path')
const fs = require('fs')

// given a plugin directory path, fetch or infer the plugin's name
module.exports = {

    getPluginName(pluginDir) {

        // if it has a package.json file, try to read that and
        // take the plugin name from that
        let packageDefFile = path.resolve(pluginDir,'package.json')
        if (fs.existsSync(packageDefFile)) {
            let packageDef = require(packageDefFile)
            if (packageDef.jbrowse && packageDef.jbrowse.pluginName) {
                return packageDef.jbrowse.pluginName
            }
        }

        // otherwise, it's the basename of the plugin directory,
        // minus any '-jbrowse-plugin' suffix
        return path.basename(pluginDir)
            .replace(/-jbrowse-plugin\/?/,'')
    }

}
