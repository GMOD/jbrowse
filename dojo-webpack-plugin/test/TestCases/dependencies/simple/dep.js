define(["module"], function(module) {
	var result = {
		runTests: function() {
			it("module.id", function() {
				module.exports.should.be.eql(result);
				module.id.should.be.eql("test/dep");
			});
		}
	};
	return result;
});
