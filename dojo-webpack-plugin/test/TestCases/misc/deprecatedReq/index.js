/*
 * The config for this test loads the old version of the ScopedRequirePlugin that uses
 * assigns the scoped require variable the deprecated 'req' property.
 */
define(["test/dep"], function(dep) {
	it("should compile", function(done) {
		done();
	});
	it("should output console warning for use of deprecated req", function() {
		var msg;
		console.warn = function(message) {
			msg = message;
		};
		dep.should.be.eql("dep");
		require("test/dep").should.be.eql(dep);
		msg.should.containEql("req is deprecated");
	});

	it("should output console warning for accessing deprecated property", function() {
		// make sure accessing a property emits console warning
		var msg;
		console.warn = function(message) {
			msg = message;
		};
		var rawConfig = require.rawConfig;
		msg.should.containEql("req is deprecated");
		rawConfig.paths.test.should.be.eql('.');
	});
});