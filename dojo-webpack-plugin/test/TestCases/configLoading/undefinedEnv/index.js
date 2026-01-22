/* globals __embedded_dojo_loader__  dojoConfig */
var loader = require(__embedded_dojo_loader__);
define([], function() {
	it ("Should resolve path as defined in loader config", function() {
		require.toUrl('foo/bar').should.be.eql("/test/foo/bar");
		require.toAbsMid('fooalias/bar').should.be.eql("/test/foo/bar");
	});
	it (`Embedded loader should ${dojoConfig.noConfigApi ? "not " : ""}have the config API`, function() {
		var loaderScope = {};
		loader.call(loaderScope, {packages:[{name:"dojo", location:"./"}]}, {hasCache:{}, modules:{}}, loaderScope, loaderScope);
		(!!loaderScope.require.packs).should.be.eql(!dojoConfig.noConfigApi);
	});
	it ("typeof embeddedLoader var should be string", function() {
		var type = typeof __embedded_dojo_loader__;
		type.should.be.eql("string");
		var embeddedLoader = __embedded_dojo_loader__;
		embeddedLoader.should.be.eql(__embedded_dojo_loader__);
	});
});
