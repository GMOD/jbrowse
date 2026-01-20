const majorVersion = "V" + parseInt(require("webpack/package.json").version.split(".")[0]);
describe("Validate version of webpack matches environment", function() {
	if (process.env.WEBPACK_VERSION) {
		it("Validate version of webpack matches environment", function() {
				console.log('Webpack version = ' + process.env.WEBPACK_VERSION);
				process.env.WEBPACK_VERSION.should.be.eql(majorVersion);
		});
	}
});
