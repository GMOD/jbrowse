define(['amd/dojoES6Promise.js'], function(Promise) {

	it("Promise should resolve.", function(done) {
		var promise = new Promise(function(resolve) {
			window.setTimeout(function() {
				resolve("resolve");
			}, 10);
		});
		promise.then(function(data) {
			try {
				data.should.be.eql("resolve");
				done();
			} catch (err) {
				done(err);
			}
		}).catch(function() {
			done(new Error("Promise rejected"));
		});
	});

	it("Promise should reject.", function(done) {
		var promise = new Promise(function(resolve__, reject) {
			window.setTimeout(function() {
				reject(new Error("rejected"));
			}, 10);
		});
		promise.then(function() {
			done(new Error("Promise should reject"));
		}).catch(function(err) {
			try {
				err.message.should.be.eql("rejected");
				done();
			} catch (_err) {
				done(_err);
			}
		});
	});

	it("Promise.resolve should return resolved promise", function(done) {
		var check = false;
		var promise = Promise.resolve("resolved");
		promise.then(function(data) {
			try {
				data.should.be.eql("resolved");
				check.should.be.eql(true);
				done();
			} catch (err) {
				done(err);
			}
		}).catch(function() {
			done(new Error("Promise rejected"));
		});
		check = true;
	});

	it("Promise.reject should return a rejected promise", function(done) {
		var check = false;
		var promise = Promise.reject(new Error("rejected"));
		promise.then(function() {
			done(new Error("Promise should reject"));
		}).catch(function(err) {
			try {
				err.message.should.be.eql("rejected");
				check.should.be.eql(true);
				done();
			} catch (_err) {
				done(_err);
			}
		});
		check = true;
	});

	it("Promise.race should resolve correctly", function(done) {
		var promise1 = new Promise(function(resolve) {
			window.setTimeout(function() {
				resolve("resolve1");
			}, 10);
		});
		var promise2 = new Promise(function() {});
		Promise.race([promise1, promise2]).then(function(data) {
			try {
				data.should.be.eql("resolve1");
				done();
			} catch (err) {
				done(err);
			}
		}).catch(function() {
			done(new Error("Promise rejected"));
		});
	});

	it("Promise.race should resolve correctly with non-promise entry", function(done) {
		var promise1 = new Promise(function(resolve) {
			window.setTimeout(function() {
				resolve("resolve1");
			}, 10);
		});
		Promise.race([promise1, "resolve2"]).then(function(data) {
			try {
				data.should.be.eql("resolve2");
				done();
			} catch (err) {
				done(err);
			}
		}).catch(function() {
			done(new Error("Promise rejected"));
		});
	});

	it("Promise.all should resolve correctly" , function(done) {
		var promise1 = new Promise(function(resolve) {
			window.setTimeout(function() {
				resolve("resolve1");
			}, 10);
		});
		var promise2 = new Promise(function(resolve) {
			window.setTimeout(function() {
				resolve("resolve2");
			}, 100);
		});
		Promise.all([promise1, promise2, "resolve3"]).then(function(data) {
			try {
				data[0].should.be.eql("resolve1");
				data[1].should.be.eql("resolve2");
				data[2].should.be.eql("resolve3");
				done();
			} catch (err) {
				done(err);
			}
		}).catch(function() {
			done(new Error("Promise rejected"));
		});
	});

	it("Promise.finally should be called on resolved promises", function(done) {
		var promise = Promise.resolve("resolved");
		var check = false, cbCalled = false;
		promise.then(function(data) {
			cbCalled = true;
			try {
				data.should.be.eql("resolved");
				check.should.be.eql(true);
			} catch (err) {
				done(err);
			}
		}).catch(function() {
			done(new Error("Promise rejected"));
		}).finally(function() {
			try {
				cbCalled.should.be.eql(true);
				done();
			} catch (err) {
				done(err);
			}
		});
		check = true;
	});

	it("Promise.finally should be called on rejected promises", function(done) {
		var promise = Promise.reject(new Error("rejected"));
		var check = false, cbCalled = false;
		promise.then(function() {
			done(new Error("Promise rejected"));
		}).catch(function(err) {
			cbCalled = true;
			try {
				err.message.should.be.eql("rejected");
				check.should.be.eql(true);
			} catch (_err) {
				done(_err);
			}
		}).finally(function() {
			try {
				cbCalled.should.be.eql(true);
				done();
			} catch (err) {
				done(err);
			}
		});
		check = true;
	});

	it("Promise.finally should be called when it's the only handler", function(done) {
		var promise = Promise.resolve("resolved");
		var check = false;
		promise.finally(function() {
			try {
				check.should.be.eql(true);
				done();
			} catch (err) {
				done(err);
			}
		});
		check = true;
	});

	it("Promise callback should be invoked asynchronously by resolver", function(done) {
		var resolver, check = false;
		var promise = new Promise(function(resolve) {
			resolver = resolve;
		});
		promise.then(function(data) {
			try {
				data.should.be.eql("resolved");
				check.should.be.eql(true);
				done();
			} catch (err) {
				done(err);
			}
		});
		resolver("resolved");
		check = true;
	});

});
