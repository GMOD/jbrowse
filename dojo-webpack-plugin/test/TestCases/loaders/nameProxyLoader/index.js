define(["namePlugin!Fred", "namePlugin!Bob"], function(helloFred, helloBob) {
	it("should load the text with the name specified in the plugin", function() {
		helloFred.replace(/[\r\n]*/g,"").should.be.eql("Hello, my name is Fred.");
		helloBob.replace(/[\r\n]*/g,"").should.be.eql("Hello, my name is Bob.");
	});
});
