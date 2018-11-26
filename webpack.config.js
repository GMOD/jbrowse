/* eslint-env node */
require('babel-polyfill')

const DojoWebpackPlugin = require("dojo-webpack-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin');

const path = require("path")
const glob = require('glob')
const webpack = require("webpack")

// if JBROWSE_BUILD_MIN env var is 1 or true, then we also minimize the JS
// and forego generating source maps
const DEBUG = ! [1,'1','true'].includes(process.env.JBROWSE_BUILD_MIN)

var webpackConf = {
    entry: {
        main: "src/JBrowse/main",
        browser: "src/JBrowse/standalone"
    },
    plugins: [
        new CleanWebpackPlugin(['dist']),

        new DojoWebpackPlugin({
            loaderConfig: require("./build/dojo-loader-config"),
            environment: {
                dojoRoot: process.env.JBROWSE_PUBLIC_PATH || "./dist/"
            },
            buildEnvironment: {
                dojoRoot: "node_modules/"
            },
            locales: ["en"],
            loader: path.resolve('./build/dojo-webpack-plugin-loader/dojo/dojo.js')
        }),

        new CopyWebpackPlugin([{
            context: "node_modules",
            from: "dojo/resources/blank.gif",
            to: "dojo/resources"
        }]),

        new webpack.NormalModuleReplacementPlugin(
            /^dojox\/gfx\/renderer!/,
            "dojox/gfx/canvas"
        ),

        new webpack.NormalModuleReplacementPlugin(/^dojo\/text!/, function(data) {
            data.request = data.request.replace(/^dojo\/text!/, "!!raw-loader!");
        }),

        new webpack.NormalModuleReplacementPlugin(
            /^css!/, function(data) {
                data.request = data.request.replace(/^css!/, "!style-loader!css-loader!sass-loader!")
            }
        ),
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules\/(?!(quick-lru|@gmod\/cram|@gmod\/bam|@gmod\/indexedfasta|@gmod\/tabix|@gmod\/tribble-index|@gmod\/binary-parser|http-range-fetcher|@gmod\/bgzf-filehandle))/,
                use: {
                  loader: 'babel-loader',
                  options: {
                    presets: ['es2015-without-strict'],
                    plugins: ['transform-async-to-generator','transform-es2015-classes'],
                    cacheDirectory: true
                  }
                }
            },
            {
                test: /src\/JBrowse\/main.js|src\/JBrowse\/standalone.js|tests\/js_tests\/main.js/,
                use: [{ loader: path.resolve('build/glob-loader.js') }]
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg|woff|woff2)$/,
                use: 'url-loader?limit=10000',
            },
            {
                // regex replace all JBrowse plugin JS to just remove any use of dojo/domReady!
                test: filepath => filepath.indexOf(__dirname+'/plugins')===0 && /\.js$/.test(filepath),
                use: {
                    loader: 'regexp-replace-loader',
                    options: {
                        match: {
                            pattern: '["`\']dojo/domReady!?["\'`]\s*',
                            flags: 'g'
                        },
                        replaceWith: '"JBrowse/has"'
                    }
                }
            }
        ]
    },
    output: {
        filename: '[name].bundle.js',
        chunkFilename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: process.env.JBROWSE_PUBLIC_PATH || 'dist/'
    },
    resolveLoader: {
        modules: ["node_modules"]
    },
    resolve: {
        symlinks: false
    }
}

if (DEBUG) {
    webpackConf.mode = 'development'
    webpackConf.entry.run_jasmine = 'tests/js_tests/main.js'
    webpackConf.plugins.push( new webpack.optimize.AggressiveMergingPlugin() )
} else {
    webpackConf.mode = 'production'
    webpackConf.plugins.push( new UglifyJsPlugin())
}

module.exports = webpackConf
