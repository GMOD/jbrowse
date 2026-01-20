define(["require", "./a"], function(req, a) {
	it("global and context require.undef should be undefined", function() {
		a.label.should.be.eql("a");
		(typeof require.undef).should.be.eql("undefined");
		(typeof req.undef).should.be.eql("undefined");
	});
});
