/*
 * Tests to provide complete test coverage for DojoAMDResolvePlugin.  These Tests
 * exercise code paths that are difficult or impossible to invoke from within
 * webpack.  As such, they provide only enough scafoliding to support
 * execution of the targeted paths.  Code changes to the module under
 * test may require additional scafolding in this file, even if the code
 * changes are not related to the paths being tested.
 */
const DojoAMDPlugin = require("../lib/DojoAMDPlugin");
const NullFactory = require("webpack/lib/NullFactory");
const {Tapable, reg, callSync} = require("webpack-plugin-compat").for("DojoAMDPlugin.tests");

class I18nExtractorItemDependency {
}
describe("DojoAMDPlugin tests", function() {
	const plugin = new DojoAMDPlugin({});
	it("should set resolveLoader aliases even if no resolverLoader is defined", function() {
		const compiler = {
			options: {}
		};
		plugin.setAliases(compiler);
		compiler.options.resolveLoader.alias["dojo/text"].should.not.be.null;
		compiler.options.resolveLoader.alias["dojo/i18n"].should.not.be.null;
	});

	it("should throw exception for down-level version of webpack-i18n-extractor plugin", function() {
		var compilation = new Tapable();
		reg(compilation, {"seal" : ["Sync"]});
		compilation.dependencyFactories = new Map();
		compilation.dependencyTemplates = new Map();
		var normalModuleFactory = new Tapable();
		reg(normalModuleFactory, {"parser" : ["Sync"]});
		plugin.compilationPlugins(compilation, {
			normalModuleFactory: normalModuleFactory
		});
		compilation.dependencyFactories.set(I18nExtractorItemDependency, new NullFactory());

		function callSeal(version, shouldThrow) {
			var exceptionThrown = false;
			I18nExtractorItemDependency.version = version;
			try {
				callSync(compilation, "seal");
			} catch (e) {
				exceptionThrown = true;
				if (shouldThrow) {
					e.message.should.match(/^You are using a down level version of webpack-i18n-extractor-plugin/);
				}
			}
			exceptionThrown.should.be.eql(shouldThrow);
		}

		callSeal(undefined, true);
		callSeal("1.0.0", true);
		callSeal("2.0.0", true);
		callSeal("2.0.5", true);
		callSeal("2.0.6", false);
		callSeal("2.1.0", false);
		callSeal("3.0.0", false);
	});
});