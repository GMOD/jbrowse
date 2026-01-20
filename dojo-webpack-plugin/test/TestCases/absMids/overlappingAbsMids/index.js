define(["a?absMid=a1", "a?absMid=a2"], function(a1, a2) {
	it("should resolve all aliases to same module", function() {
		a1.should.be.eql("a");
		a1.should.be.eql(a2);
		require("a").should.be.eql(a1);
		require("a1").should.be.eql(a1);
		require("a2").should.be.eql(a1);
	});
});
