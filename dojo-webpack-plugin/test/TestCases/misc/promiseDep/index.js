define(['require', './a', './c'], function (require, a) {
	it("should load a define promise dependency without resolving the value", function(done) {
    a.then(function(result) {  // Error here y.then is not a function
      result.should.be.eql("a");
			done();
    });
	});

	it("should load a require promise dependency without resolving the value", function(done) {
		require(['./b'], function(b) {
			b.then(function(result) {
				result.should.be.eql("b");
				done();
			});
		});
	});

	it("should load a runtime require promise dependency without resolving the value", function(done) {
		const deps = [];
		deps.push('./b', './c');
		require(deps, function(b, c) {
			b.then(function(result1) {
				result1.should.be.eql("b");
				c.then(function(result2) {
					result2.should.be.eql("c");
					done();
				});
			});
		});
	});

});