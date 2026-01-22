define(['testLoader?addAbsMids=a&filterAbsMids=testLoader!content.txt'], function(content) {
	define("loader module extension tests - filterAbsMids", function() {
		it("Should filter the absMids matching the specified regex", function(done) {
			content.should.be.eql("content");
			require("a").should.be.eql(content);
			try {
				require('testLoader?addAbsMids=a&filterAbsMids=.*!content.txt');
				return done(new Error("Shouldn't get here"));
			} catch (e) {
				done();
			}
		});
	});
});
