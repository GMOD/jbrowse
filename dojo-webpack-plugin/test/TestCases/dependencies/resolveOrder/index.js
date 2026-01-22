define(["dojo/main"], function(main) {
	it("module path defined in Dojo loader config should resolve before files in node_modules", function() {
		main.should.be.eql("main");
	});
});