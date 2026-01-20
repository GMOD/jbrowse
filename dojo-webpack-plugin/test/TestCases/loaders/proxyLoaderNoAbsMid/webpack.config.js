var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = {
	entry: "dojo/loaderProxy?loader=test/fooLoader&deps=test/foo!test/foo",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
};
