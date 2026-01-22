/* globals __embedded_dojo_loader__  dojoConfig cjsRequire */
define(["foo", "fooalias"], function(foo, fooalias) {
	it ("should load foo", function() {
		foo.should.be.eql("foo");
		fooalias.should.be.eql("foo");
	});
	it ("Should not resolve foo as defined by environment", function() {
		typeof(require.toUrl("foo")).should.be.eql("undefined");
	});
	it (`Embedded loader should ${dojoConfig.noConfigApi ? "not " : ""}have the config API`, function() {
		var loader = cjsRequire(__embedded_dojo_loader__);
		var loaderScope = {};
		loader.call(loaderScope, {packages:[{name:"dojo", location:"./"}]}, {hasCache:{}, modules:{}}, loaderScope, loaderScope);
		(!!loaderScope.require.packs).should.be.eql(!dojoConfig.noConfigApi);
	});
});
