define(["require", "dojo/text!test/hello.txt"], function(require, hello) {
	it("should load text files" , function() {
		"hello".should.be.eql(hello);
		require("dojo/text!./hello.txt").should.be.eql(hello);
	});
});
