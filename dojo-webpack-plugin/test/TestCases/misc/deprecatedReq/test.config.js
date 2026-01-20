const majorVersion = parseInt(require("webpack/package.json").version.split(".")[0]);
module.exports = {
	noTests: majorVersion >= 4
};