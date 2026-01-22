define(["module", "exports"], function(module, exports) {
	it("test async require vars", function() {
		module.id.should.eql("test/asyncDep");
		module.exports.should.eql(exports);
	});

	module.exports = "asyncDep";
});
