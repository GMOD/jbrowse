define(["module", "exports"], function(module, exports) {

	it("test async require vars", function(done) {
		module.id.should.eql("test/asyncDep2");
		module.exports.should.eql(exports);
		done();
	});

	return "asyncDep2";
});
