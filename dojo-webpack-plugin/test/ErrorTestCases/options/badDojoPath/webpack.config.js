var DojoWebpackPlugin = require("../../../../index");
module.exports = {
	entry: "test/index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				packages:[{name: "dojo", location: "./dojo"}]
			},
			noConsole: true
		})
	]
};
