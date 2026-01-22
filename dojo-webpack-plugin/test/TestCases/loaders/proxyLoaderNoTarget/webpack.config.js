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
			/^test\/fooLoader!/, "dojo/loaderProxy?loader=test/fooLoader!"
		)	]
};
