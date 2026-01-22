define(['testLoader?addAbsMids=a|b!test/content.txt'], function(content) {
	define("loader module extension tests", function() {
		it("Should add the specified absMid to the module - addAbsMid", function() {
			content.should.be.eql("content");
			require('testLoader?addAbsMids=a|b!test/content.txt').should.be.eql(content);
			require("a").should.be.eql(content);
			require("b").should.be.eql(content);
		});
	});
});
