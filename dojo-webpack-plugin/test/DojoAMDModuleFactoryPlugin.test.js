/*
 * Tests to provide complete test coverage for DojoAMDModuleFactoryPlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDModuleFactoryPlugin = require("../lib/DojoAMDModuleFactoryPlugin");
const {Tapable, tap, reg, callSync, callSyncWaterfall} = require("webpack-plugin-compat").for("DojoAMDModuleFactoryPlugin.tests");
const plugin = new DojoAMDModuleFactoryPlugin({});

class Factory extends Tapable {
	constructor() {
		super();
		reg(this, {
			"beforeResolve" : ["AsyncSeriesWaterfall", "data"],
			"resolver"      : ["SyncWaterfall", "resolver"],
			"createModule"  : ["SyncBail", "data"],
			"module"        : ["SyncWaterfall", "module", "data"]
		});
	}
	addAbsMid(data, absMid) {
		return this.events["add absMid"](data, absMid);
	}
}

describe("DojoAMDModuleFactoryPlugin tests", function() {
	var factory;
	var compiler;
	var compilation;
	beforeEach(function() {
		factory = new Factory();
		compiler = new Tapable();
		compilation = new Tapable();
		reg(compiler, {
			"normal-module-factory" : ["Sync", "factory"],
			"compilation"         : ["Sync", "compilation", "params"],
			"get dojo require"		: ["SyncBail"]
		});
		reg(compilation, {
			"seal" : ["Sync"],
			"build-module"  : ["SyncBail", "module"]
		});
		plugin.apply(compiler);
		plugin.factory = factory;
		callSync(compiler, "normal-module-factory", factory);
		callSync(compiler, "compilation", compilation, {normalModuleFactory: factory});
	});
	function getAbsMids(data) {
		var result = [];
		plugin.filterAbsMids(data, absMid => result.push(absMid));
		return result;
	}
	describe("addAbsMid tests", function() {
		it("should add the absMid", function() {
			var data = {};
			plugin.addAbsMid(data, "a");
			data.absMid.should.be.eql("a");
			getAbsMids(data).length.should.be.eql(1);

			plugin.addAbsMid(data, "b");
			var absMids = getAbsMids(data);
			data.absMid.should.be.eql("b");
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql("b");
			absMids[1].should.be.eql("a");

			data = {absMid: "a"};
			absMids = getAbsMids(data);
			absMids.length.should.be.eql(1);
			absMids[0].should.be.eql("a");

			data = {absMid: 'a'};
			plugin.addAbsMid(data, 'b');
			absMids = getAbsMids(data);
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql('b');
			absMids[1].should.be.eql('a');

			// ensure provisional absMids remain behind non-provisional absMids
			data = {absMid: 'a'};
			plugin.addAbsMid(data, 'b', true);
			absMids = getAbsMids(data);
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql('a');
			absMids[1].should.be.eql('b');

			data = {};
			plugin.addAbsMid(data, 'd', true);
			data.absMid = 'b';
			data.absMid = 'a';
			plugin.addAbsMid(data, 'c', true);
			var absMids = getAbsMids(data);
			absMids.length.should.be.eql(4);
			absMids[0].should.be.eql('a');
			absMids[1].should.be.eql('b');
			absMids[2].should.be.eql('c');
			absMids[3].should.be.eql('d');
		});

		it("Should throw with empty absMid", function(done) {
			try {
				var data = {};
				plugin.addAbsMid(data, "");
				return done(new Error("Should have thrown"));
			} catch (e) {
				e.message.should.containEql("Illegal absMid:");
				done();
			}
		});

		it("Should throw with empty absMid assignment", function(done) {
			try {
				var data = {};
				plugin.addAbsMid(data, "a");
				data.absMid = '';
				return done(new Error("Should have thrown"));
			} catch (e) {
				e.message.should.containEql("Illegal absMid:");
				done();
			}
		});
	});

	describe("filterAbsMids tests", function() {
		it("Should remove the specified aliases", function() {
			var data = {};
			var absMids = [];
			plugin.addAbsMid(data, 'c');
			plugin.addAbsMid(data, 'b');
			plugin.addAbsMid(data, 'a');
			plugin.filterAbsMids(data, absMid => {
				return absMid === "b";
			});
			data.absMid.should.be.eql("b");
			plugin.filterAbsMids(data, absMid => absMids.push(absMid));
			absMids.length.should.be.eql(1);

			data = {};
			plugin.addAbsMid(data, 'c');
			plugin.addAbsMid(data, 'b');
			plugin.addAbsMid(data, 'a');
			plugin.filterAbsMids(data, absMid => {
				return absMid !== "b";
			});
			data.absMid.should.be.eql("a");
			absMids = [];
			plugin.filterAbsMids(data, absMid => absMids.push(absMid));
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql("a");
			absMids[1].should.be.eql("c");

			data = {};
			plugin.addAbsMid(data, 'c');
			plugin.addAbsMid(data, 'b');
			plugin.addAbsMid(data, 'a');
			plugin.filterAbsMids(data, absMid => {
				return absMid !== "c";
			});
			data.absMid.should.be.eql("a");
			absMids = [];
			plugin.filterAbsMids(data, absMid => absMids.push(absMid));
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql("a");
			absMids[1].should.be.eql("b");

			data = {};
			plugin.addAbsMid(data, 'c');
			plugin.addAbsMid(data, 'b');
			plugin.addAbsMid(data, 'a');
			plugin.filterAbsMids(data, () => {
				return false;
			});
			(typeof data.absMid).should.be.eql('undefined');

			// shouldn't blow up if absMidAliaes is missing
			data = {};
			plugin.addAbsMid(data, 'a');
			plugin.filterAbsMids(data, () => {
				return true;
			});
			data.absMid.should.be.eql("a");
			absMids = [];
			plugin.filterAbsMids(data, absMid => absMids.push(absMid));
			absMids.length.should.be.eql(1);
		});
	});

	describe("processAbsMidQueryArgs tests", function() {
		it("Should parse no-arg requests properly", function() {
			var data = {};
			data.request = "foo/bar";
			plugin.processAbsMidQueryArgs(data);
			(typeof data.absMid).should.be.eql('undefined');
		});
		it("Should parse request with single absMid properly", function() {
			var data = {};
			data.request = "./bar?absMid=foo/bar";
			plugin.processAbsMidQueryArgs(data);
			data.request.should.be.eql("./bar");
			data.absMid.should.be.eql("foo/bar");
		});
		it("Should parse request with multple absMids and other args properly", function() {
			var data = {};
			var absMids = [];
			data.request = "moduleA?q=123&absMid=test/a&id=456&absMid=foo/a";
			plugin.processAbsMidQueryArgs(data);
			data.request.should.be.eql("moduleA?q=123&id=456");
			data.absMid.should.be.eql("foo/a");
			plugin.filterAbsMids(data, absMid => absMids.push(absMid));
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql("foo/a");
			absMids[1].should.be.eql("test/a");
		});
		it("Should parse requests with no absMid args properly", function() {
			var data = {};
			data.request = "moduleA?q=123&s=abc";
			plugin.processAbsMidQueryArgs(data);
			data.request.should.be.eql("moduleA?q=123&s=abc");
			(typeof data.absMid).should.be.eql('undefined');
		});
		it("Should parse requests with absMid args in multiple plugin segments", function() {
			var data = {};
			var absMids = [];
			data.request = "moduleA?absMid=a!moduleB!moduleC?absMid=c!moduleD?q=123";
			plugin.processAbsMidQueryArgs(data);
			data.request.should.be.eql("moduleA!moduleB!moduleC!moduleD?q=123");
			data.absMid.should.be.eql("c");
			plugin.filterAbsMids(data, absMid => absMids.push(absMid));
			absMids.length.should.be.eql(2);
			absMids[0].should.be.eql("c");
			absMids[1].should.be.eql("a");
		});
	});

	describe("'add absMids from request event' tests", function() {
		it("should gracefully handle undefined data object", function(done) {
			try {
				callSync(factory, "add absMids from request", null);
				done();
			} catch (err) {
				done(err);
			}
		});

		it("should gracefully handle undefined data.dependencies object", function(done) {
			tap(compiler, {"get dojo require" : function() {
				return {toAbsMid: function(a) {return a;}};
			}});
			try {
				const data = {request: "foo/bar"};
				callSync(factory, "add absMids from request", data);
				data.absMid.should.be.eql(data.request);
				done();
			} catch (err) {
				done(err);
			}
		});
	});

	describe("'module' event tests", function() {
		it("Should gracefully handle missing absMidAliases in data object", function() {
			const module = {absMid: 'a'};
			const existing = {};
			var absMids = [];
			compilation.findModule = function() { return existing; };
			const result = callSyncWaterfall(factory, "module", module, {});
			result.should.be.eql(module);
			(typeof result.addAbsMid).should.be.eql('function');
			(typeof result.filterAbsMids).should.be.eql('function');
			existing.absMid.should.eql('a');
			plugin.filterAbsMids(existing, absMid => absMids.push(absMid));
			absMids.length.should.eql(1);
		});
	});

	describe("toAbsMid tests", function() {
		it("Should return undefined for undefined request", function() {
			(typeof plugin.toAbsMid()).should.be.eql('undefined');
		});
	});
});
