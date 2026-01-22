var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = [
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require.resolve("./loaderConfig"),
			environment: {foopath: "/foo", dojoRoot: "release"},
			buildEnvironment: {foopath: "test/foo", dojoRoot:"../../../../node_modules"},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require("./loaderConfig"),
			environment: {foopath: "/foo", dojoRoot: "release", noConfigApi:true},
			buildEnvironment: {foopath: "test/foo", dojoRoot:"../../../../node_modules"},
			loader: path.join(__dirname, "../../../js/noconfig/dojo/dojo.js")
		})
	]
},
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			noConsole: true,
			loaderConfig: function(env) {
				var config = require("./loaderConfig")(env);
				config.has['dojo-config-api'] = 1;
				return config;
			},
			environment: {foopath: "/foo", dojoRoot: "release"},
			buildEnvironment: {foopath: "test/foo", dojoRoot:"../../../../node_modules"}
		})
	]
}];
