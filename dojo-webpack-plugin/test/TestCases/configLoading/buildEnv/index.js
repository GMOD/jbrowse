/* globals __embedded_dojo_loader__  dojoConfig cjsRequire */
define(["foo", "fooalias", "dojo/_base/lang"], function(foo, fooalias) {
	it ("should load foo", function() {
		foo.should.be.eql("foo");
		fooalias.should.be.eql("foo");
	});
	it (`Embedded loader should ${dojoConfig.noConfigApi ? "not " : ""}have the config API`, function() {
		var loader = cjsRequire(__embedded_dojo_loader__);
		var loaderScope = {};
		loader.call(loaderScope, {packages:[{name:"dojo", location:"./"}]}, {hasCache:{}, modules:{}}, loaderScope, loaderScope);
		(!!loaderScope.require.packs).should.be.eql(!dojoConfig.noConfigApi);
	});
	it ("Should resolve foo as defined by environment", function() {
		require.toUrl("foo").should.be.eql("/foo");
	});
	it ("Should resolve dojo runtime path correctly", function() {
		require.toUrl("dojo/_base/lang").should.be.eql("release/dojo/_base/lang");
	});
});
