define(["dojo/i18nRootModifier?bundledLocales=!test/strings"], function(strings) {
	it("should load the strings without a root", function() {
		strings.hello.should.be.eql("hello");
	});
});
