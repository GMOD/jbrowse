var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = [true, false].map(pathinfo => { return {
	entry: "test/index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				has: {"host-browser": false}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	],
	output: {pathinfo:pathinfo}

};});
