define(["dojo/query!css2"], function(engine) {
	it("should load the specified selector engine" , function() {
		"css2".should.be.eql(engine);
		require("dojo/query!css2").should.be.eql(engine);
	});
});
