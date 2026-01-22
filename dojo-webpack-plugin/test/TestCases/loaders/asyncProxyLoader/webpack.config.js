var path = require("path");
var webpack = require("webpack");
var DojoWebpackPlugin = require("../../../../index");

module.exports = {
	entry: "test/index",
	plugins: [
		new webpack.NormalModuleReplacementPlugin(
			/^test\/asyncPlugin!/, function(data) {
				var match = /^test\/asyncPlugin!(.*)$/.exec(data.request);
				data.request = "dojo/loaderProxy?loader=test/asyncPlugin&name=" + match[1] + "!";
			}
		),
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."}
			},
			async: true,
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
};
