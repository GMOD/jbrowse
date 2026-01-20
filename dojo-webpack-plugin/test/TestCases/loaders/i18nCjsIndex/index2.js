it("should load the strings", function() {
	Promise.all([
		require("dojo/i18n!test/nls/stringsNoRoot"),
		require("dojo/i18n!./nls/strings")
	]).then(function([strings1, strings2]) {
		strings1.hello.should.be.eql("Hello");
		strings2.goodby.should.be.eql("Bon par");
	});
});
module.exports = {};
