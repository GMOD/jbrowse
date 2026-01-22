const version = require("webpack/package.json").version;
const versionParts = version.split(".").map(part => {
	return parseInt(part);
});

define("named1", [], function() {
	return "named1";
});

define("named2", [], function() {
	return "named2";
});

define("named3", [], function() {
	return "named3";
});

define("named4", [], function() {
	return "named4";
});

// Need fix in webpack version 3.7 so skip this test if older version
// https://github.com/webpack/webpack/pull/5771
if (versionParts[0] > 3 || versionParts[0] === 3 && versionParts[1] >= 7) {
	define("named1,named2".split(","), function(named1, named2) {
		it("should load the named modules in const defined dependencies", function() {
			"named1".should.be.eql(named1);
			"named2".should.be.eql(named2);
		});

		it("should load the named modules in const require dependencies", function(done) {
			try {
				require("named3,named4".split(','), function (named3, named4) {
					"named3".should.be.eql(named3);
					"named4".should.be.eql(named4);
					done();
				});
			} catch(e) {
				done(e);
			}
		});
	});
} else {
	it("Skipping due to unsupported webpack version", function(done) {
		done();
	});
}