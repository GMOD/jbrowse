var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = {
	entry: "test/index",
	resolve: {
		alias: {
			pkg1: path.resolve(__dirname, 'pkg1', 'index'),
			pkg2: path.resolve(__dirname, 'pkg2', 'index')
		}
	},
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
};
