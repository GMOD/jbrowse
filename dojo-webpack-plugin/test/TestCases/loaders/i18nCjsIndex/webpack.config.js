var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = [
{
	entry: "./index1",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				locale: "fr",
				has: {"host-browser": 0, "dojo-config-api": 0}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js"),
			locales: ["fr"]
		})
	]
},
{
	entry: "./index2",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				locale: "fr",
				has: {"host-browser": 0, "dojo-config-api": 0}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js"),
			locales: ["fr"]
		})
	]
},{
	entry: "test/index1",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				locale: "fr",
				has: {"host-browser": 0, "dojo-config-api": 0}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js"),
			locales: ["fr"]
		})
	]
},
{
	entry: "./index3",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				locale: "fr",
				has: {"host-browser": 0, "dojo-config-api": 0}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js"),
			locales: []
		})
	]
}];
