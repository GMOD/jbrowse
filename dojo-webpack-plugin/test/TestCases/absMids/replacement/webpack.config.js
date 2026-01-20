var path = require("path");
var webpack = require("webpack");
var DojoWebpackPlugin = require("../../../../index");
module.exports = {
	entry: "test/index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		}),
		new webpack.NormalModuleReplacementPlugin(
			/fooLoader!/, "foo"
		),
		new webpack.NormalModuleReplacementPlugin(
			/barLoader!bar/, "dojo/text!bar.txt"
		)
	]
};
