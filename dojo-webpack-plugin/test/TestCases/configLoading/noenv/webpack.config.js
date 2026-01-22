var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = [
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require.resolve("./loaderConfig"),
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: Object.assign({}, require("./loaderConfig"), {noConfigApi:true}),
			loader: path.join(__dirname, "../../../js/noconfig/dojo/dojo.js")
		})
	]
},
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			noConsole: true,
			loaderConfig: Object.assign({}, require("./loaderConfig"), {has:{'dojo-config-api':0}, noConfigApi:true})
		})
	]
}];
