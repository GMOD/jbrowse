var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = {
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				has: {"host-browser": 0, "dojo-config-api": 0},
				baseUrl: "foo"
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
};
