/* globals __embedded_dojo_loader__  dojoConfig */
var loader = require(__embedded_dojo_loader__);
define(["foo", "fooalias"], function(foo, fooalias) {
	it ("should load foo", function() {
		foo.should.be.eql("foo");
		fooalias.should.be.eql("foo");
	});

	it ("Should resolve foo as defined by environment", function() {
		require.toUrl("foo").should.be.eql("test/foo");
	});

	it (`Embedded loader should ${dojoConfig.noConfigApi ? "not " : ""}have the config API`, function() {
		var loaderScope = {};
		loader.call(loaderScope, {packages:[{name:"dojo", location:"./"}]}, {hasCache:{}, modules:{}}, loaderScope, loaderScope);
		(!!loaderScope.require.packs).should.be.eql(!dojoConfig.noConfigApi);
	});
});
