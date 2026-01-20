define(["exports", "module", "./dep"], function(exports, module, dep) {
	it("should compile", function(done) {
		done();
	});
	it("require scoping", function() {
		// verify require function hasn't been renamed
		var name = "req";
		name += "uire";
		eval(name).should.be.eql(require);
		(typeof require.toUrl).should.be.eql("function");
		(typeof require.toAbsMid).should.be.eql("function");
	});

	it("defined vars" , function() {
		module.exports.should.be.eql(exports);
		module.id.should.be.eql('test/index');
		module.i.should.not.be.eql(module.id);
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
		/* global require */
		try {
			require(['require', 'module', 'exports', 'asyncDep', 'test/asyncDep'], function(req, reqModule, reqExports, asyncDep) {
				reqModule.id.should.be.eql(module.id);
				reqExports.should.be.eql(exports);
				asyncDep.should.be.eql("asyncDep");
				// context require
				require("asyncDep").should.be.eql(asyncDep);
				require("test/asyncDep").should.be.eql(asyncDep);
				req('./asyncDep').should.be.eql(asyncDep);
				done();
			});
		} catch(e) {
			done(e);
		}
	});

	it("require sans callback", function(done) {
		var resolver;
		global.asyncDep3Promise = new Promise((resolve) => {
			resolver = resolve;
		});
		global.asyncDep3Promise.resolve = resolver;
		require(["asyncDep3"]);
		global.asyncDep3Promise.then(() => {
			try {
				var dep3 = ['asyncDep3'];
				require(dep3);
			} catch (err) {
				return done(err);
			}
			done();
		});
	});

	it("runtime require failures", function(done) {
		var notTrue;
		if (notTrue) {
			// async require we don't execute just so webpack knows about the dependency
			require(["test/asyncDep2"], function() {});
		}
		// Synchronous require should fail
		try {
			require('test/asyncDep2');
			return done(new Error("Expected exception thrown"));
		} catch(ignore) {}

		var waitForError = new Promise(function(resolve) {
			var handle = require.on("error", function(error) {
				handle.remove();
				error.info.length.should.be.eql(2);
				error.info[0].mid.should.be.eql("missing");
				error.info[1].mid.should.be.eql("test/asyncDep2");
				resolve();
			});
		});
		// Runtime async require should fail because the chunk hasn't been loaded yet.
		var deps = ["missing", "test/asyncDep2"];
		require(deps, function() {
			return done(new Error("rutime require callback should not be called"));
		});

		try {
			waitForError.then(function() {
				// Call webpack's require.ensure to load the chunk containing test/asyncDep2
				require.ensure(["test/asyncDep2"], function() {
					// Synchonous require should still fail because module hasn't been defined.
					try {
						require('test/asyncDep2');
						return done(new Error("Expected exception thrown"));
					} catch(ignore) {}

					waitForError = new Promise(function(resolve) {
						var handle = require.on("error", function(error) {
							handle.remove();
							error.info.length.should.be.eql(1);
							error.info[0].mid.should.be.eql("missing");
							resolve();
						});
					});
					// Async require should still fail because of "missing", but "test/asyncDep2"
					// should have been loaded and initialized.
					require(deps, function() {
						return done(new Error("rutime require callback should not be called"));
					});
					waitForError.then(function() {
						setTimeout(function() {
							require("test/asyncDep2").should.be.eql("asyncDep2");
							done();
						}, 0);
					});
				});
			});
		} catch(e) {
			done(e);
		}
	});
	dep.runTests();
});
