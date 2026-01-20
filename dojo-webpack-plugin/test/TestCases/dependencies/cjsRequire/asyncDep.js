/* global cjsRequire */
define([], function() {
	it("should load CommonJS modules from async chunk", function() {
		cjsRequire("./cjsModule2").should.be.eql("cjs2");
	});
});