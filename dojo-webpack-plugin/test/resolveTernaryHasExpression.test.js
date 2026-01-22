var DojoAMDRequireItemDependency = require("../lib/DojoAMDRequireItemDependency");
require("should");
var resolve = DojoAMDRequireItemDependency.resolveTernaryHasExpression;
var features = {};
var props = {
	require: {
		has: function(feature) {
			return features[feature];
		}
	},
	options: {}
};

describe("resolveTernaryHasExpression", function() {
	beforeEach(function() {
		features = {};
		props.options = {};
	});

	it("Should return non-feature expression unchanged", function() {
		var deps = [];
		var result = resolve(null, deps, props);
		(result === null).should.be.true;
		deps.length.should.be.eql(0);

		result = resolve("", deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		result = resolve("foo", [], props);
		result.should.be.eql("foo");
		deps.length.should.be.eql(0);
	});

	it("Should resolve single expression correctly", function() {
		var deps = [];
		var expression = "has!feature?foo:bar";
		var result = resolve(expression, deps, props);
		result.should.be.eql("feature?%%0:%%1");
		deps.length.should.be.eql(2);
		deps[0].should.be.eql("foo");
		deps[1].should.be.eql("bar");

		props.options.coerceUndefinedToFalse = true;
		var result = resolve(expression, deps, props);
		result.should.be.eql("bar");
		deps.length.should.be.eql(0);

		features.feature = true;
		delete props.options.coerceUndefinedToFalse;
		var result = resolve(expression, deps, props);
		result.should.be.eql("foo");
		deps.length.should.be.eql(0);

		features.feature = false;
		var result = resolve(expression, deps, props);
		result.should.be.eql("bar");
		deps.length.should.be.eql(0);

		// try with unspecified modules name
		expression = "has!feature?foo";
		features.feature = true;
		var result = resolve(expression, deps, props);
		result.should.be.eql("foo");
		deps.length.should.be.eql(0);

		features.feature = false;
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		delete features.feature;
		var result = resolve(expression, deps, props);
		result.should.be.eql("feature?%%0");
		deps.length.should.be.eql(1);
		deps[0].should.be.eql("foo");

		expression = "has!feature?:bar";
		features.feature = true;
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		features.feature = false;
		var result = resolve(expression, deps, props);
		result.should.be.eql("bar");
		deps.length.should.be.eql(0);

		delete features.feature;
		var result = resolve(expression, deps, props);
		result.should.be.eql("feature?:%%0");
		deps.length.should.be.eql(1);
		deps[0].should.be.eql("bar");


	});

	it("Should resolve complex expression correctly", function() {
		var deps = [];
		var expression = "has!f1?f2?f1f2:f1^f2:f2?^f1f2:^f1^f2";
		var result = resolve(expression, deps, props);
		result.should.be.eql("f1?f2?%%0:%%1:f2?%%2:%%3");
		deps.length.should.be.eql(4);
		deps[0].should.be.eql("f1f2");
		deps[1].should.be.eql("f1^f2");
		deps[2].should.be.eql("^f1f2");
		deps[3].should.be.eql("^f1^f2");

		features = {f1:true};
		result = resolve(expression, deps, props);
		result.should.be.eql("f2?%%0:%%1");
		deps.length.should.be.eql(2);
		deps[0].should.be.eql("f1f2");
		deps[1].should.be.eql("f1^f2");

		features = {f1:false};
		result = resolve(expression, deps, props);
		result.should.be.eql("f2?%%0:%%1");
		deps.length.should.be.eql(2);
		deps[0].should.be.eql("^f1f2");
		deps[1].should.be.eql("^f1^f2");

		features = {f2:true};
		result = resolve(expression, deps, props);
		result.should.be.eql("f1?%%0:%%1");
		deps.length.should.be.eql(2);
		deps[0].should.be.eql("f1f2");
		deps[1].should.be.eql("^f1f2");

		features = {f2:false};
		result = resolve(expression, deps, props);
		result.should.be.eql("f1?%%0:%%1");
		deps.length.should.be.eql(2);
		deps[0].should.be.eql("f1^f2");
		deps[1].should.be.eql("^f1^f2");

		features = {f1:false, f2:false};
		result = resolve(expression, deps, props);
		result.should.be.eql("^f1^f2");
		deps.length.should.be.eql(0);

		features = {f1:true, f2:true};
		result = resolve(expression, deps, props);
		result.should.be.eql("f1f2");
		deps.length.should.be.eql(0);

		features = {f1:true, f2:false};
		result = resolve(expression, deps, props);
		result.should.be.eql("f1^f2");
		deps.length.should.be.eql(0);

		features = {f1:false, f2:true};
		result = resolve(expression, deps, props);
		result.should.be.eql("^f1f2");
		deps.length.should.be.eql(0);

		// test with empty module expressions
		// f1&&f2 || ^f1&&^f2
		features = {};
		expression = "has!f1?f2?f1f2::f2?:^f1^f2";
		result = resolve(expression, deps, props);
		result.should.be.eql("f1?f2?%%0:f2?:%%1");
		deps.length.should.be.eql(2);
		deps[0].should.be.eql("f1f2");
		deps[1].should.be.eql("^f1^f2");

		features = {f1:true};
		result = resolve(expression, deps, props);
		result.should.be.eql("f2?%%0");
		deps.length.should.be.eql(1);
		deps[0].should.be.eql("f1f2");

		features = {f1:false};
		result = resolve(expression, deps, props);
		result.should.be.eql("f2?:%%0");
		deps.length.should.be.eql(1);
		deps[0].should.be.eql("^f1^f2");

		features = {f2:false};
		result = resolve(expression, deps, props);
		result.should.be.eql("f1?:%%0");
		deps.length.should.be.eql(1);
		deps[0].should.be.eql("^f1^f2");

		features = {f1: true, f2: true};
		var result = resolve(expression, deps, props);
		result.should.be.eql("f1f2");
		deps.length.should.be.eql(0);

		features = {f1: false, f2: false};
		result = resolve(expression, deps, props);
		result.should.be.eql("^f1^f2");
		deps.length.should.be.eql(0);

		features = {f1: true, f2: false};
		result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		features = {f1: false, f2: true};
		result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		// f1&&^f2 || ^f1&&f2
		features = {};
		expression = "has!f1?f2?:f1^f2:f2?^f1f2";
		result = resolve(expression, deps, props);
		result.should.be.eql("f1?f2?:%%0:f2?%%1");
		deps.length.should.be.eql(2);
		deps[0].should.be.eql("f1^f2");
		deps[1].should.be.eql("^f1f2");

		features = {f1:true};
		var result = resolve(expression, deps, props);
		result.should.be.eql("f2?:%%0");
		deps.length.should.be.eql(1);
		deps[0].should.be.eql("f1^f2");

		features = {f1:false};
		var result = resolve(expression, deps, props);
		result.should.be.eql("f2?%%0");
		deps.length.should.be.eql(1);
		deps[0].should.be.eql("^f1f2");

		features = {f2:true};
		var result = resolve(expression, deps, props);
		result.should.be.eql("f1?:%%0");
		deps.length.should.be.eql(1);
		deps[0].should.be.eql("^f1f2");

		features = {f2:false};
		var result = resolve(expression, deps, props);
		result.should.be.eql("f1?%%0");
		deps.length.should.be.eql(1);
		deps[0].should.be.eql("f1^f2");

		features = {f1: true, f2: true};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		features = {f1: false, f2: false};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		features = {f1: true, f2: false};
		var result = resolve(expression, deps, props);
		result.should.be.eql("f1^f2");
		deps.length.should.be.eql(0);

		features = {f1: false, f2: true};
		var result = resolve(expression, deps, props);
		result.should.be.eql("^f1f2");
		deps.length.should.be.eql(0);

	});

	it("Should resolve no-module expressions correctly", function() {
		var deps = [];

		var expression = "has!f1?f1";
		features = {f1: false};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		var expression = "has!f1?f2?f1f2";
		features = {f1: false};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		features = {f2: false};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		expression = "has!f1?f2?f3?f1f2f3";
		features = {f1: false};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		features = {f2: false};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		features = {f3: false};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		var expression = "has!f1?:^f1";
		features = {f1: true};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		var expression = "has!f1?:f2?:^f1^f2";
		features = {f1: true};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		features = {f2: true};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		expression = "has!f1?:f2?:f3?:^f1^f2^f3";
		features = {f1: true};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		features = {f2: true};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);

		features = {f3: true};
		var result = resolve(expression, deps, props);
		result.should.be.eql("");
		deps.length.should.be.eql(0);


	});
});