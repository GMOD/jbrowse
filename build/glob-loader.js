const glob = require('glob')
const path = require('path')

const {getPluginName} = require('./plugin-util')

const blacklist = {};
`
JBrowse/main
`
.trim().split(/\s+/).forEach(mid => blacklist[mid] = 1)

const format = 'AMD';

function log(msg) {
    console.log(`jbrowse-glob-loader: ${msg}`)
}

const JBrowseModuleIds =
    glob.sync('src/JBrowse/**/*.js')
    .map(f=>f.replace('src/','').replace('.js',''))
    .filter( mid => ! /\.profile$/.test(mid) )
    .reverse()

log(`building ${JBrowseModuleIds.length} JBrowse modules`)

const pluginModuleIds =
    glob.sync('plugins/*/') // local plugins
    .concat(glob.sync('node_modules/*-jbrowse-plugin/')) // unscoped modules
    .concat(glob.sync('node_modules/@*/*-jbrowse-plugin/')) // scoped modules
    .map( pluginDir => {
        let pluginName = getPluginName(pluginDir)
        return glob.sync(pluginDir+'/js/**/*.js')
        .map( f => {
            let mid = f.replace(pluginDir,pluginName+'/')
                .replace('.js','')
                .replace('/js/','/')
            return mid
        })
    })
    .reduce((a,b) => a.concat(b), [])
    .reverse()
    .filter( mid => ! /\.profile$/.test(mid) )

// log out all the module IDs from plugins
pluginModuleIds.forEach( mid => log(`adding plugin module ${mid}`) )

const mids = JBrowseModuleIds.concat(pluginModuleIds)

// tiny Webpack Loader that replaces "//! webpackRequireGlob" expressions with a big bunch of requires
module.exports = function(content,map,meta) {
    return content.replace(
        '//!! glob-loader, please include every JBrowse and plugin module here',
        function (match) {
            return mids.map( (mid,i) => {
                let blacklisted = '';
                if (blacklist[mid]) {
                    blacklisted = '//SKIPPED '
                    log(`skipping entry point module ${mid}`)
                }
                let code =
                    format === 'CommonJS' ? `${blacklisted}var __webpackRequireGlob${i} = require('./${mid}') // ${mid}` :
                                            `${blacklisted} '${mid}',`
                //console.log(code)
                return code
            }).join('\n')
        }
    )
}
