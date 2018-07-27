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

const AUTOPREFIXER_BROWSERS = [
    'Android 2.3',
    'Android >= 4',
    'Chrome >= 35',
    'Firefox >= 31',
    'Explorer >= 9',
    'iOS >= 7',
    'Opera >= 12',
    'Safari >= 7.1',
  ];

var webpackConf = {
    entry: {
        main: "src/JBrowse/main",
    },
    plugins: [
        new CleanWebpackPlugin(['dist']),

        new DojoWebpackPlugin({
            loaderConfig: require("./build/dojo-loader-config"),
            environment: {
                dojoRoot: "./dist"
            },
            buildEnvironment: {
                dojoRoot: "node_modules"
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
                exclude: /node_modules/,
                use: {
                  loader: 'babel-loader',
                  options: {
                    presets: ['es2015-without-strict'],
                    cacheDirectory: true
                  }
                }
            },
            {
                test: /src\/JBrowse\/main.js|tests\/js_tests\/main.js/,
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
        publicPath: 'dist/'
    },
    resolveLoader: {
        modules: ["node_modules"]
    },
    resolve: {
        symlinks: false
    }
}

if (DEBUG) {
    webpackConf.devtool = 'source-map'
    webpackConf.entry.run_jasmine = 'tests/js_tests/main.js'
    webpackConf.plugins.push( new webpack.optimize.AggressiveMergingPlugin() )
} else {
    webpackConf.plugins.push( new UglifyJsPlugin({ parallel: 4 }))
}

module.exports = webpackConf
