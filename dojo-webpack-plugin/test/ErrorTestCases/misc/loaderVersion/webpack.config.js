var DojoWebpackPlugin = require("../../../../index");
var path = require("path");
var fs = require("fs-extra");

var testRoot = path.resolve(__dirname, "../../../");
var loader = fs.readFileSync(path.join(__dirname, "../../../js/dojo/dojo.js"), "utf-8");
var loaderPath = path.join(path.resolve(testRoot, "js", path.relative(testRoot, __dirname)), "dojoLoader.js");
loader = loader.replace(/(this\.loaderVersion)\s*=\s*"[^"]+"/, '$1 = "1.0.0"');
fs.ensureDirSync(path.join(loaderPath, ".."));
fs.writeFileSync(loaderPath, loader, "utf-8");
module.exports = {
	entry: "test/index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: "."}
			},
			loader: loaderPath,
			noConsole: true
		})
	]
};
