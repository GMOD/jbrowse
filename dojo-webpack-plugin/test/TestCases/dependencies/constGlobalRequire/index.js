define("require".split(','), function(req) {
	it("should load dep from global context", function(done) {
		require("./asyncDep,asyncDep".split(','), function(asyncDep1, asyncDep2) {
			try {
				asyncDep1.should.be.eql("global asyncDep");
				asyncDep2.should.be.eql("local asyncDep");
				require("./asyncDep").should.be.eql("global asyncDep");
				try {
					// parent traversal should fail because we don't specify numParents
					require("../globalContext/asyncDep");
					return done(new Error("Shouldn't get here"));
				} catch(e) {}
				require("asyncDep").should.be.eql("local asyncDep");
				done();
			} catch (e) {
				done(e);
			}
		});
	});
	it("should load dep from local context", function(done) {
		req("./asyncDep,asyncDep".split(','), function(asyncDep1, asyncDep2) {
			try {
				asyncDep1.should.be.eql("local asyncDep");
				asyncDep2.should.be.eql("local asyncDep");
				req("./asyncDep").should.be.eql("local asyncDep");
				req("../test/asyncDep").should.be.eql("local asyncDep");
				req("asyncDep").should.be.eql("local asyncDep");
				done();
			} catch (e) {
				done(e);
			}
		});
	});
});
