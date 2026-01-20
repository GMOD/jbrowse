define("module,exports".split(","), function(module, exports) {
	exports.runTests = function() {
		it("defined vars", function(done) {
			module.exports.should.be.eql(exports);
			module.id.should.be.eql("test/dep");
			done();
		});
	};
});
