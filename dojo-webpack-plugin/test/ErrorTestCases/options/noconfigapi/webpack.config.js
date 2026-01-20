var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = {
	entry: "test/index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require.resolve("./loaderConfig.js"),
			loader: path.join(__dirname, "../../../js/noconfig/dojo/dojo.js")
		})
	]
};
