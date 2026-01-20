var DojoWebpackPlugin = require("../../../../index");
var path = require("path");
var fs = require("fs-extra");

var testRoot = path.resolve(__dirname, "../../../");
var targetPath = path.resolve(testRoot, "js", path.relative(testRoot, __dirname));
var pkgPath = path.join(targetPath, "dojo/package.json");
fs.ensureDirSync(path.join(targetPath, "dojo"));
fs.writeFileSync(pkgPath, "{\"name\":\"foo\", \"version\":\"1.0.0\"}", "utf-8");
module.exports = {
	entry: "test/index",
	plugins: [
		new DojoWebpackPlugin({
			loaderConfig: {
				paths:{test: ".", dojo: path.resolve(pkgPath, '..')}
			},
			noConsole: true
		})
	]
};
