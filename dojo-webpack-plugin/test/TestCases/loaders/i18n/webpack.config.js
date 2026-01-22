var path = require("path");
var DojoWebpackPlugin = require("../../../../index");

module.exports = (
 [undefined, "en-us", "fr", "es", "de", "it-ch", "zh-hk"].map(locale => {
	return {
		entry: "test/index",
		plugins: [
			new DojoWebpackPlugin({
				loaderConfig: {
					paths:{test: "."},
					has: {"host-browser": 0, "dojo-config-api": 0},
					locale: locale
				},
				locales: ["en", "fr", "es", "de", "it-ch", "zh-hk"],
				loader: path.join(__dirname, "../../../js/dojo/dojo.js")
			})
		]
	};
 })
).concat(
	[undefined, "en-us", "fr", "es", "de", "it", "it-ch", "zh-hk"].map(locale => {
	return {
		entry: "test/index",
		plugins: [
			new DojoWebpackPlugin({
				loaderConfig: {
					paths:{test: "."},
					has: {"host-browser": 0, "dojo-config-api": 1},
					locale: locale === 'es' ? "es-us" : locale
				},
				loader: path.join(__dirname, "../../../js/dojo/dojo.js")
			})
		]
	};
 })
).concat(
	[undefined, "en-us", "fr", "es", "de", "it", "it-ch", "zh-hk"].map(locale => {
	return {
		entry: "test/index",
		plugins: [
			new DojoWebpackPlugin({
				loaderConfig: {
					paths:{test: "."},
					has: {"host-browser": 0, "dojo-config-api": 1, "empty-locales": 1},
					locale: locale
				},
				locales: [],
				loader: path.join(__dirname, "../../../js/dojo/dojo.js")
			})
		]
	};
})
);
