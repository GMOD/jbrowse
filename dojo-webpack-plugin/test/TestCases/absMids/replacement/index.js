define(["fooLoader!foo", "barLoader!bar.txt"], function(foo, bar) {
	it("should resolve renamed aliases for both original and modified names", function() {
		foo.should.be.eql("foo");
		require("fooLoader!foo").should.be.eql(foo);
		require("foo").should.be.eql(foo);
	});

	it("should resolve renamed aliases for only original name", function(done) {
		bar.should.be.eql("bar");
		require("barLoader!bar.txt").should.be.eql(bar);
		try {
			require("raw-loader!bar.txt");
			done(Error("Should not get here"));
		} catch (error) {
			done();
		}
	});
});
