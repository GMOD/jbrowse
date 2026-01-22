var DojoWebpackPlugin = require("../../../../index");
module.exports = [true, false].map(pathInfo => {
	return {
		entry: "test/index",
		plugins: [
			new DojoWebpackPlugin({
				loaderConfig: {
					paths:{test: "."},
					packages:[{name: "dojo", location: "../../../../node_modules/dojo"}]
				},
				noConsole: true
			})
		],
		output: {
			pathinfo: pathInfo
		}
	};
});
