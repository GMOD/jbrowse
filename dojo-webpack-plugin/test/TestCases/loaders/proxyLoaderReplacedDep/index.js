define(["./addHeaderPlugin!./content.txt"], function(contentWithHeader) {
	it("should add header to content", function() {
		"Header\ncontent".should.be.eql(contentWithHeader);
	});
});
