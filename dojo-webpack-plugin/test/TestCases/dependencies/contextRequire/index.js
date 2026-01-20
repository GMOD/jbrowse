/* global __webpack_require__ */
define([], function() {
	it("should load context require modules", function() {
		var req = require.context("./subdir", false, /cjsModule?/);
		__webpack_require__(req.resolve("./cjsModule1")).should.be.eql("cjs1");
		__webpack_require__(req.resolve("./cjsModule2")).should.be.eql("cjs2");
		__webpack_require__(req.resolve("./cjsModule3")).should.be.eql("cjs3");
	});
});
