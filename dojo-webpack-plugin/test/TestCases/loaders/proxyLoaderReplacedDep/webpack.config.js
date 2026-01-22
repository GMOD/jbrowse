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
			/^test\/addHeaderPlugin!/, function(data) {
				var match = /^test\/addHeaderPlugin!(.*)$/.exec(data.request);
				data.request = "dojo/loaderProxy?loader=test/addHeaderPlugin&deps=text%21" + match[1] + "!" + match[1];
			}
		),
		new webpack.NormalModuleReplacementPlugin(/^text!/, (data) => {
			data.request = data.request.replace(/^text!/, "!!raw-loader!");
		})
	]
};
