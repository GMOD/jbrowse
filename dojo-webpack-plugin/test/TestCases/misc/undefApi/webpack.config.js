var path = require("path");
var DojoWebpackPlugin = require("../../../../index");
module.exports = [
{
	entry: "test/index1",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				has: {'dojo-undef-api': true},
				testCase: "context require with config object"
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index1",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: function() {
				return {
					paths:{test: "."},
					has: {'dojo-undef-api': true},
					testCase: "context require with config function"
				};
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index1",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: path.join(__dirname,"loaderConfig"),
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index1",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: path.join(__dirname,"loaderConfigFn"),
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index3",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				has: {'dojo-undef-api': true},
				testCase: "global require with config object"
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index3",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: function() {
				return {
					paths:{test: "."},
					has: {'dojo-undef-api': true},
					testCase: "global require with config function"
				};
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index3",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: path.join(__dirname,"loaderConfig"),
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index3",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: path.join(__dirname,"loaderConfigFn"),
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index2",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				has: {'dojo-undef-api': false}
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index4",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				has: {'host-browser':0, 'dojo-undef-api': true, 'a':true, 'b':true},
				runtimeFeatures: ['a']
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index4",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				has: {'host-browser':0, 'dojo-undef-api': true, 'a':true, 'b':true},
				runtimeFeatures: ['a']
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index4",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				has: {'host-browser':0, 'dojo-undef-api': true, 'a':true, 'b':true},
				runtimeFeatures: ['a']
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
},
{
	entry: "test/index4",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."},
				has: {'host-browser':0, 'dojo-undef-api': true, 'a':true, 'b':true},
				runtimeFeatures: ['a']
			},
			loader: path.join(__dirname, "../../../js/dojo/dojo.js")
		})
	]
}
];
