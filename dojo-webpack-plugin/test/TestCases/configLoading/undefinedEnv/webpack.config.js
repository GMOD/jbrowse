var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = [
/*{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: require.resolve("./loaderConfig"),
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},*/
{
	entry: "./index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: function() {
				return Object.assign({}, require("./loaderConfig")(), {noConfigApi: 1});
			},
			loader: path.join(__dirname, "../../../js/noconfig/dojo/dojo.js")
		})
	]
}
];
