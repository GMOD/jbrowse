/*
 * Tests to provide complete test coverage for DojoLoaderValidatorPlugin.  These
 * tests exercise code paths that are difficult or impossible to invoke from
 * within webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const {Tapable} = require("webpack-plugin-compat").for("DojoLoaderPlugin.test");

const DojoLoaderValidatorPlugin = require("../lib/DojoLoaderValidatorPlugin");
var plugin;
describe("DojoLoaderValidatorPlugin tests", function() {
	describe("validateEmbeddedLoader edge cases", function() {
		var compiler;
		beforeEach(function() {
			plugin = new DojoLoaderValidatorPlugin({loaderConfig:{}, noConsole:true});
			compiler = new Tapable();
			compiler.context = '.';
			plugin.compiler = compiler;
		});
		it("Should invoke callback with error if nomralModuleFactory.create returns an error", function(done) {
			var error = new Error("Failed to create module");
			plugin.compilation = {
				compiler:plugin.compiler
			};
			plugin.params = {
				normalModuleFactory: {
					create: function(params__, callback) {
						callback(error);
					}
				}
			};
			plugin.embeddedLoader = plugin.filename = "";
			plugin.validateEmbeddedLoader(plugin.compilation, err => {
				err.should.be.eql(error);
				done();
			});
		});

		it("Should invoke callback with no error for child compiler", function(done) {
			plugin.compilation = {
				compiler:{}
			};
			plugin.validateEmbeddedLoader(plugin.compilation, err => {
				(typeof err === 'undefined').should.be.true;
				done();
			});
		});
	});
});
