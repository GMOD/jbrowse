const DojoWebpackPlugin = require("dojo-webpack-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

const path = require("path");
const webpack = require("webpack");

var webpackConf = {
    entry: "src/JBrowse/main",
    plugins: [
        new DojoWebpackPlugin({
            loaderConfig: require("./build/dojo-loader-config"),
            environment: {
                dojoRoot: "../node_modules"
            },
            buildEnvironment: {
                dojoRoot: "node_modules"
            },
            locales: ["en"]
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

        process.env.JBROWSE_BUILD_MIN ? new UglifyJsPlugin() : null
    ].filter( p => !!p),
    module: {
        rules: [
            {
                test: path.resolve('src/JBrowse/main.js'),
                use: [{ loader: path.resolve('build/glob-loader.js') }]
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
    node: {
        process: false,
        global: false
    }
}

if(process.env.JBROWSE_BUILD_MIN) {
    webpackConf.plugins.push( new UglifyJsPlugin())
} else {
    webpackConf.devtool = 'eval-source-map'
}

module.exports = webpackConf
