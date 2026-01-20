define([], function() {
	it("should compile", function(done) {
		try {
			require(["dep"], function() {
				done();
			});
		} catch(e) {
			done(e);
		}
	});
});
