var DojoWebpackPlugin = require("../../../../index");
module.exports = {
	entry: "test/index",
	plugins: [
		new DojoWebpackPlugin({
			async: true,
			loaderConfig: {
				paths:{test: "."}
			},
			noConsole: true
		})
	]
};
