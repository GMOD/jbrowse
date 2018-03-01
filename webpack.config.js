const path = require('path');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const DojoWebpackPlugin = require('dojo-webpack-plugin');

module.exports = {
  entry: './src/JBrowse/init.js',
  plugins: [
    new DojoWebpackPlugin({
		loaderConfig: require("./src/JBrowse/JBrowse.profile.js"),
        locales: ["en", "es", "fr"],
        loader: path.resolve(__dirname,"./build/dojo-webpack-loader/dojo/dojo.js"),
	}),
    // new HTMLWebpackPlugin({
    //   title: 'JBrowse'
    // })
  ],
  output: {
    filename: '[name].[chunkhash].bundle.js',
    chunkFilename: '[name].[chunkhash].bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
};
