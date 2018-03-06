const DojoWebpackPlugin = require("dojo-webpack-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const ExtractTextPlugin = require("extract-text-webpack-plugin")

const path = require("path")
const glob = require('glob')
const webpack = require("webpack")

const DEBUG = !process.argv.includes('--release') && !process.env.JBROWSE_BUILD_MIN;
const VERBOSE = process.argv.includes('--verbose');
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

const extractSass = new ExtractTextPlugin({
    filename: "[name].css"
});

var webpackConf = {
    entry: {
        main: "src/JBrowse/main",
    },
    plugins: [
        new DojoWebpackPlugin({
            loaderConfig: require("./build/dojo-loader-config"),
            environment: {
                dojoRoot: "../node_modules"
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

        extractSass,
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                  loader: 'babel-loader',
                  options: {
                    presets: ['@babel/preset-env'], //< NOTE: respects package.json->browserslist
                    cacheDirectory: true
                  }
                }
            },
            {
                test: /src\/JBrowse\/main.js|tests\/js_tests\/main.js/,
                use: [{ loader: path.resolve('build/glob-loader.js') }]
            },
            {
                test:/\.s?css$/,
                use: extractSass.extract({
                    use:['css-loader', 'sass-loader']
                })
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg|woff|woff2)$/,
                use: 'url-loader?limit=10000',
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
    },

}

if (DEBUG) {
    webpackConf.devtool = 'source-map'
    webpackConf.entry.run_jasmine = 'tests/js_tests/main.js'
    webpackConf.plugins.push( new webpack.optimize.AggressiveMergingPlugin() )
} else {
    webpackConf.plugins.push( new UglifyJsPlugin({ parallel: 4 }))
}

module.exports = webpackConf
