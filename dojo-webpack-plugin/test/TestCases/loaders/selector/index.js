define(["./selector/_loader!"], function(selector) {
	it("should load selector/lite", function() {
		"test/selector/lite".should.be.eql(selector);
		require("test/selector/_loader!").should.be.eql(selector);
		require("test/selector/lite").should.be.eql(selector);
	});
});
