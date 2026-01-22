var DojoWebpackPlugin = require("../../../../index");
module.exports = {
	entry: "test/index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				packages:[{name: "dojo", location: "../../../../node_modules/dojo"}]
			},
			noConsole: true
		})
	]
};
