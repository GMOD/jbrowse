define("exports,module,./dep".split(","), function(exports, module, dep) {
	it("should compile", function(done) {
		done();
	});

	it("require scoping", function() {
		// verify require function hasn't been renamed;
		var name = "req";
		name += "uire";
		eval(name).should.be.eql(require);
		(typeof require.toUrl).should.be.eql("function");
		(typeof require.toAbsMid).should.be.eql("function");
	});

	it("defined vars" , function() {
		exports.should.be.eql(exports);
		module.id.should.be.eql("test/index");
	});

	it("require", function(done) {
		require('test/dep').should.be.eql(dep);
		var exceptionThrown;
		try {
			require('test/asyncDep');
		} catch(e) {
			exceptionThrown = true;
		}
		exceptionThrown.should.be.true();
		try {
			require('require,module,exports,asyncDep,test/asyncDep'.split(','), function(require, reqModule, reqExports, asyncDep) {
				reqModule.id.should.be.eql(module.id);
				reqExports.should.be.eql(exports);
				asyncDep.should.be.eql("asyncDep");
				// context require
				require("asyncDep").should.be.eql(asyncDep);
				require('test/asyncDep').should.be.eql(asyncDep);
				done();
			});
		} catch(e) {
			done(e);
		}
	});

	dep.runTests();
});
