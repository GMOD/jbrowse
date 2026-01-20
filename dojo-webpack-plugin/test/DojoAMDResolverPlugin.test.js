/*
 * Tests to provide complete test coverage for DojoAMDResolvePlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDResolverPluginBase = require("../lib/DojoAMDResolverPluginBase");
const {Tapable, reg, tap} = require("webpack-plugin-compat").for("DojoAMDResolverPlugin.test");
const plugin = new DojoAMDResolverPluginBase();

describe("DojoAMDResolverPlugin tests", function() {
	const compiler = new Tapable();
	reg(compiler, {"get dojo require" : ["SyncBail"]});
	tap(compiler, {"get dojo require" : () => {
		return {
			toUrl: (request) => {
				return request.request === "null" ? null : request.request;
			}
		};
	}});
	plugin.compiler = compiler;
	describe("resolver tests", () => {
		it("Should invoke callback with no args for directory request", done => {
			plugin.module({directory:true}, null, (err, data) => {
				(typeof err).should.be.eql('undefined');
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
		it("Should invoke callback with no args for null request", done => {
			plugin.module({request: "null", path:"."}, null, (err, data) => {
				(typeof err).should.be.eql('undefined');
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
		it("Should invoke callback with no args for identity request", done => {
			plugin.module({request: "null", path:"."}, null, (err, data) => {
				(typeof err).should.be.eql('undefined');
				(typeof data).should.be.eql('undefined');
				done();
			});
		});
	});
});
