const glob = require('glob')

const blacklist = {};
`
JBrowse/Model/DataView
JBrowse/Model/TabixIndex
JBrowse/Store/TabixIndexedFile
JBrowse/Store/SeqFeature/BigWig
JBrowse/Store/SeqFeature/VCFTabix
JBrowse/Store/BigWig
JBrowse/Store/SeqFeature/GFF3Tabix
JBrowse/Store/SeqFeature/BEDTabix
JBrowse/main2
JBrowse/main
`
.trim().split(/\s+/).forEach(mid => blacklist[`src/${mid}.js`] = 1)

console.log(blacklist)

const format = 'AMD';

// tiny Webpack Loader that replaces "//! webpackRequireGlob" expressions with a big bunch of requires
module.exports = function(content,map,meta) {
    return content.replace(
        /\/\/\s*!\s*webpackRequireGlob\s*\(([^\)]+)\)/,
        function (match, globExpression) {
            globExpression = globExpression.trim().replace(/^['"]|["']$/g,'')
            let files = glob.sync('src/'+globExpression)
            return files.map( (filename,i) => {
                let blacklisted = blacklist[filename] ? '//BLACKLISTED ' : '';
                let code =
                    format === 'CommonJS' ? `${blacklisted}var __webpackRequireGlob${i} = require('${filename.replace('src/JBrowse/','./').replace('.js','')}') // ${filename}` :
                                            `${blacklisted} '${filename.replace('src/','').replace('.js','')}',`
                console.log(code)
                return code
            }).join('\n')
        }
    )
}
