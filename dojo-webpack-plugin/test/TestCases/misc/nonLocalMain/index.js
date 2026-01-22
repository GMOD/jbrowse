define(['dojo/has', 'foo', 'bar', 'foo/relPathTests', 'bar/relPathTests'], function(has, foo, bar, fooTests, barTests) {
	it ("should load main modules from bar/main.js", function() {
		foo.should.be.eql("bar/main");
		bar.should.be.eql("bar/main");
	});

	it("should return correct value from toUrl", function()  {
		var fooAbsMid = require.toAbsMid("foo");
		var barAbsMid = require.toAbsMid("bar");
		fooAbsMid.should.be.eql("foo");
		barAbsMid.should.be.eql("bar/main");
		require.toUrl(fooAbsMid).should.be.eql('sub/foo/../../sub/bar/main');
		require.toUrl(barAbsMid).should.be.eql('sub/bar/main');
	});

	it ("should run relPath tests successfully", function() {
		fooTests();
		barTests();
	});

	it ("should load main module from bar/main.js at runtime", function(done) {
		var deps = [];
		deps.push("foo");
		deps.push("bar");
		require(deps, function(rtFoo, rtBar) {
			rtFoo.should.be.eql("bar/main");
			rtBar.should.be.eql("bar/main");
			done();
		});
	});

	if (has('dojo-config-api')) {
		it ("rawConfig should specify original main path", function() {
			require.rawConfig.packages.find(function(pkg){return pkg.name==='foo';}).main.should.be.eql('../../sub/bar/main');
		});
	}
});
