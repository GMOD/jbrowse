define(['dojo/loaderProxy?loader=test/addHeaderPlugin&deps=dojo/text%21./content.txt!./content.txt'], function(contentWithHeader) {
	it("should add header to content", function() {
		"Header\ncontent".should.be.eql(contentWithHeader);
	});
});
