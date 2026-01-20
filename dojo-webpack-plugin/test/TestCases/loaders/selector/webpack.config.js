var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
var webpack = require("webpack");
module.exports = {
	entry: "test/index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		}),
		new webpack.NormalModuleReplacementPlugin(/^test\/selector\/_loader!$/, "test/selector/lite")
],
	resolve: {
		alias: {
			'test/selector/lite': path.join(__dirname, "./selector.js")
		}
	}};
