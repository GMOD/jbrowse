var DojoWebpackPlugin = require("../../../../index");
var ScopedRequirePluginDeprecated = require("../../../plugins/ScopedRequirePluginDeprecated");
module.exports = {
	entry: "test/index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				packages:[{name: "dojo", location: "../../../../node_modules/dojo"}]
			},
			noConsole: true
		}),
		new ScopedRequirePluginDeprecated()
	]
};
