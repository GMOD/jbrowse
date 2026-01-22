define(["test/a"], function(a) {
	it("should compile", function(done) {
		done();
	});
	it("should load dependency", function() {
		a.should.be.eql("a");
	});
});
