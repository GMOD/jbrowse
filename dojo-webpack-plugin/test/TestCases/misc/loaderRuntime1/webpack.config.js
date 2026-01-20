const majorVersion = parseInt(require("webpack/package.json").version.split(".")[0]);
var path = require("path");
var webpack = require("webpack");
var DojoWebpackPlugin = require("../../../../index");
var config = {
	entry: {
		app: "./index"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js"
	},
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require("./loaderConfig"),
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
};
if (majorVersion >= 4) {
	config.plugins.push(new webpack.optimize.RuntimeChunkPlugin({name:"runtime"}));
	config.optimization = {splitChunks: false};
} else {
	config.plugins.push(new webpack.optimize.CommonsChunkPlugin({
		name: "runtime",
		filename: "runtime.js",
		minChunks: Infinity
	}));
}
module.exports = config;
