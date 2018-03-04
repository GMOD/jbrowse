const glob = require('glob')
const path = require('path')

const blacklist = {};
// `
// JBrowse/Model/TabixIndex
// JBrowse/Store/TabixIndexedFile
// JBrowse/Store/SeqFeature/BigWig
// JBrowse/Store/SeqFeature/VCFTabix
// JBrowse/Store/BigWig
// JBrowse/Store/SeqFeature/GFF3Tabix
// JBrowse/Store/SeqFeature/BEDTabix
// `+
`
JBrowse/main2
JBrowse/main
`
.trim().split(/\s+/).forEach(mid => blacklist[mid] = 1)

const format = 'AMD';

const mids =
    glob.sync('src/JBrowse/**/*.js').map(f=>f.replace('src/','').replace('.js',''))
    .concat(
        glob.sync('plugins/*/js/**/*.js')
        .filter( f => ! /\.profile\.js/.test(f) )
        .map( f => {
            let mid = f.replace('plugins/','').replace('.js','').replace('/js/','/')
            console.log(`build/glob-loader: adding plugin module ${mid}`)
            return mid
        })
    );

// tiny Webpack Loader that replaces "//! webpackRequireGlob" expressions with a big bunch of requires
module.exports = function(content,map,meta) {
    return content.replace(
        '//!! glob-loader, please include every JBrowse and plugin module here',
        function (match) {
            return mids.map( (mid,i) => {
                let blacklisted = '';
                if (blacklist[mid]) {
                    blacklisted = '//BLACKLISTED '
                    console.log(`build/glob-loader: skipping blacklisted module ${mid}`)
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
