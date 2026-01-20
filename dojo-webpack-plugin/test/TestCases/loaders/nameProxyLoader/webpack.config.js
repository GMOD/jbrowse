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
			/^namePlugin!/, function(data) {
				var match = /^namePlugin!(.*)$/.exec(data.request);
				data.request = "dojo/loaderProxy?loader=test/namePlugin&deps=dojo/text%21test/content.txt&name=" + match[1] + "!";
			}
		)	]
};
