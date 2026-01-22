var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
const contextdir = path.resolve(__dirname, "globalContext");
module.exports = [contextdir, contextdir+'/'].map(context => {
	return {
		context: context,
		entry: "test/index",
		plugins: [
			new DojoWebpackPlugin({
				loaderConfig: {
					baseUrl: "../",
					paths:{test: "."},
					testVarName: "$$root$$"
				},
				globalContext: {
					numParents: 1
				},
				loader: path.join(__dirname, "../../../js/dojo/dojo.js")
			})
		]
	};
}).concat(["./globalContext", "./globalContext/"].map(context => {
	return {
		entry: "test/index",
		plugins: [
			new DojoWebpackPlugin({
				loaderConfig: {
					paths:{test: "."},
					testVarName: "$$root$$"
				},
				loader: path.join(__dirname, "../../../js/dojo/dojo.js"),
				globalContext: {
					context: context,
					numParents: 1
				}
			})
		]
	};
})).concat([contextdir, contextdir+'/'].map(context => {
	return {
		entry: "test/index",
		plugins: [
			new DojoWebpackPlugin({
				loaderConfig: {
					paths:{test: "."},
					testVarName: "%%root%%"
				},
				loader: path.join(__dirname, "../../../js/dojo/dojo.js"),
				globalContext: {
					context: context,
					numParents: 1,
					varName: "%%root%%"
				}
			})
		]
	};
}));
