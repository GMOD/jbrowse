const promise = require("./promiseDep");
const unwrapPromiseValue = require("../../../../cjs/unwrapPromiseValue");
it("cjs require should return a promise value", function(done) {
	Promise.resolve(promise)
	  .then(wrappedPromise => unwrapPromiseValue(wrappedPromise))
		.then(value => {
			value.should.be.eql("Done!");
			done();
		});

});