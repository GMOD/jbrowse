var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = [
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require.resolve("./loaderConfig"),
			buildEnvironment: {foopath: "test/foo"},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require("./loaderConfig"),
			buildEnvironment: {foopath: "test/foo", noConfigApi:true},
			environment: {noConfigApi: true},
			noConsole: true
		})
	]
},
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require("./loaderConfig"),
			buildEnvironment: {foopath: "test/foo", noConfigApi:false},
			environment: {noConfigApi:false},
			noConsole: true
		})
	]
}];
