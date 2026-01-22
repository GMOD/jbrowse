const major = parseInt(require("webpack/package.json").version.split('.')[0]);
const result = {};
if (major < 4) {
	result.test = function(error) {
		return /Async mode requires webpack 4.28.4 or greater/.test(error.message);
	};
}
module.exports = result;