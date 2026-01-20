/*
 * Tests to provide complete test coverage for DojoAMDRequireDependenciesBlockParserPlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDDependencyParserMixin = require("../lib/DojoAMDDependencyParserMixin");

describe("DojoAMDDependencyParserMixin tests", function() {
	class Base {
		constructor(processItemCb, processArrayCb) {
			this.processItemCb = processItemCb;
			this.processArrayCb = processArrayCb;
		}
		processItem(...args) {
			this.processItemCb(...args);
		}
		processArray(...args) {
			this.processArrayCb(...args);
		}
	}
	class Test extends DojoAMDDependencyParserMixin(Base) {}

	it("call processItem with conditional expression should call super", function() {
		var processItemCalled;
		const test = new Test(() => {
			processItemCalled = true;
		});
		test.processItem({}, {}, {
			isString: function() {return false;},
			isConditional: function() {return true;}
		});
		processItemCalled.should.be.eql(true);
	});

	it("call processArray with unrecognized param type should call super", function() {
		var processArrayCalled;
		const test = new Test(null, () => {
			processArrayCalled = true;
		});
		test.processArray({}, {}, {
			isArray: function() {return false;},
			isConstArray: function() {return false;}
		});
		processArrayCalled.should.be.eql(true);
	});
});
