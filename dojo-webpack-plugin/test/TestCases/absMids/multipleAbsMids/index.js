define(["a?absMid=a1&absMid=a2"], function(a) {
	it("should resolve all aliases to same module", function() {
		a.should.be.eql("a");
		require("a").should.be.eql(a);
		require("a1").should.be.eql(a);
		require("a2").should.be.eql(a);
	});
});
