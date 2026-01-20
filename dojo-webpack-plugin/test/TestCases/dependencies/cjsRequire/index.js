/* global cjsRequire */
define(["./amdModule"], function(amd) {
	it("should load CommonJS modules using cjsRequire", function(done) {
		try {
			amd.should.be.eql("amd");
			cjsRequire("./cjsModule1").should.be.eql("cjs1");
			require(["asyncDep"], function() {
				done();
			});
		} catch(e) {
			done(e);
		}
	});
	it("should load CommonJS module using cjsRequirePatterns option", function() {
		require("./cjsModule3").should.be.eql("cjs3");
	});
});
