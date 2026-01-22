module.exports = function(env) {
	it("foopath should be defined in environment", function() {
		env.foopath.should.be.defined;
	});
	it("dojoRoot should be correct", function() {
		env.dojoRoot.should.be.eql("release");
	});
	return {
		paths: {foo: env.foopath},
		packages: [{name:"dojo", location:env.dojoRoot + "/dojo"}],
		aliases: [[/^fooalias$/, function() {return env.foopath;}]],
		has: {"host-browser":0},
		noConfigApi: !!env.noConfigApi
	};
};
