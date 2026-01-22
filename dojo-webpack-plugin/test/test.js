/*
 * (C) Copyright IBM Corp. 2012, 2016 All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 /*
 	MIT License http://www.opensource.org/licenses/mit-license.php
 	Author Tobias Koppers @sokra
 */

/*eslint no-shadow: [, { "allow": ["options"] }]*/
var should = require("should");
var path = require("path");
var fs = require("fs");
var vm = require("vm");
var Test = require("mocha/lib/test");
var cloneDeep = require("clone-deep");
var DojoWebackPlugin = require("../index");

var Stats = require("webpack/lib/Stats");
var webpack = require("webpack");
var ScopedRequirePlugin = require('../').ScopedRequirePlugin;
var MainTemplatePlugin = require("./plugins/MainTemplatePlugin");
var ScopedRequirePluginDeprecated = require("./plugins/ScopedRequirePluginDeprecated");
var webpackMajorVersion = parseInt(require("webpack/package.json").version.split(".")[0]);

var testGroups = {
	default: {},
	djPropRenamed: {pluginOptions: {requireFnPropName: "djPropRenamed"}}
};
if (webpackMajorVersion >= 4) {
	testGroups.async = {pluginOptions: {async:true}};
}


describe("TestCases", () => {
	runTestCases("TestCases");
});

describe("ErrorTestCases", () => {
	runTestCases("ErrorTestCases");
});

function runTestCases(casesName) {
	var casesPath = path.join(__dirname, casesName);
	var categories = fs.readdirSync(casesPath);
	categories = categories.map(function(cat) {
		return {
			name: cat,
			tests: fs.readdirSync(path.join(casesPath, cat)).filter(function(folder) {
				return folder.indexOf("_") < 0;
			}).sort()
		};
	});
	categories.forEach(function(category) {
		Object.keys(testGroups).forEach(testGroup => {
			describe(category.name + (testGroup ? (' - ' + testGroup) : ''), function() {
				category.tests.forEach(function(testName) {
					var suite = describe(testName, function() {});
					var testDirectory = path.join(casesPath, category.name, testName);
					const isErrorTest = fs.existsSync(path.join(testDirectory, "expectedError.js"));
					const isCompilerErrors = fs.existsSync(path.join(testDirectory, "errors.js"));
					const isCompilerWarnings = fs.existsSync(path.join(testDirectory, "warnings.js"));
					it(testName + (isErrorTest ? " should fail" : " should compile") + (isCompilerErrors ? " with errors" : isCompilerWarnings ? " with warnings" : ""), function(done) {
						this.timeout(60000);
						var outputDirectory = path.join(__dirname, "js", casesName, category.name, testName + (testGroup ? ('_' + testGroup) : ''));
						var testConfig = {};
						try {
							// try to load a test file
							testConfig = require(path.join(testDirectory, "test.config.js"));
						} catch(e) {}
						if (testConfig.noTests) return process.nextTick(done);
						if (testConfig.mode && testConfig.mode !== testGroup) {
							return process.nextTick(done);
						}

						var options = cloneDeep(require(path.join(testDirectory, "webpack.config.js")));
						var optionsArr = [].concat(options);
						optionsArr.forEach(function(options, idx) {
							if(!options.context) options.context = testDirectory;
							if(!options.entry) options.entry = "./index.js";
							if(!options.target) options.target = "web";
							if(!options.output) options.output = {};
							if(typeof options.output.pathinfo === "undefined") options.output.pathinfo = true;
							if(!options.output.filename) options.output.filename = "bundle" + idx + ".js";
							if(!options.output.chunkFilename) options.output.chunkFilename = "[id].bundle" + idx + ".js";
							if(!options.node) options.node = 	{process: false, global: false, Buffer: false};

							options.output.path = outputDirectory;
						  options.plugins = options.plugins || [];
							if (!options.plugins.some(plugin => {
								return plugin instanceof ScopedRequirePluginDeprecated;
							})) {
								options.plugins.push(new ScopedRequirePlugin());
							}
							options.plugins.forEach(plugin => {
								if (plugin instanceof DojoWebackPlugin) {
									Object.assign(plugin.options, testGroups[testGroup].pluginOptions);
								}
							});
							options.plugins.push(new MainTemplatePlugin());
							if (webpackMajorVersion >= 4) {
								options.mode = options.mode || "development";
								options.devtool = false;
							}
						});
						try {
							webpack(options, function(err, stats) {
								if (checkExpectedError(isErrorTest, testDirectory, err, done)) {
									console.error(err);
									return;
								}
								var statOptions = Stats.presetToOptions("verbose");
								statOptions.colors = false;
								fs.writeFileSync(path.join(outputDirectory, "stats.txt"), stats.toString(statOptions), "utf-8");
								var jsonStats = stats.toJson({
									errorDetails: true
								});
								if(checkArrayExpectation(testDirectory, jsonStats, "error", "Error", done)) return;
								if(checkArrayExpectation(testDirectory, jsonStats, "warning", "Warning", done)) return;
								var exportedTests = 0;

								function _it(title, fn) {
									var test = new Test(title, fn);
									suite.addTest(test);
									exportedTests++;
									return test;
								}

								var filesCount = 0;
								if (!testConfig.findBundle) {
									testConfig.findBundle = function(i, options) {
										if(fs.existsSync(path.join(options.output.path, "bundle" + i + ".js"))) {
											return "./bundle" + i + ".js";
										}
									};
								}
								for(var i = 0; i < optionsArr.length; i++) {
									var bundlePath = testConfig.findBundle(i, optionsArr[i]);
									if(bundlePath) {
										filesCount++;
										var context = vm.createContext({
											console: console,
											process: process,
											setTimeout: setTimeout,
											setInterval: setInterval,
											clearTimeout: clearTimeout,
											clearInterval: clearInterval,
											Promise: Promise
										});
										context.global = context;
										context.it = _it;
										Object.defineProperty(context, "should", {
									    set: function() {},
									    get: function() {
									      return should.valueOf();
									    },
									    configurable: true
									  });
										const bundlePaths = Array.isArray(bundlePath) ? bundlePath : [bundlePath];
										bundlePaths.forEach(bundlePath => {
											var content;
											var p = path.join(outputDirectory, bundlePath);
											content = fs.readFileSync(p, "utf-8");
											var module = {exports: {}};
											const prologue = `
	should.extend('should', Object.prototype);\n
	Object.assign = function() { throw new Error(\"Don't use Object.assign (not supported in all browsers).\");};\n`;

											var fn = vm.runInContext("(function(require, module, exports, __dirname, __filename, global, window) {\n" + prologue + content + "\n})", context, p);
											fn.call(context, require, module, module.exports, path.dirname(p), p, context, context);
										});
									}
								}
								// give a free pass to compilation that generated an error
								if(!jsonStats.errors.length && filesCount !== optionsArr.length) return done(new Error("Should have found at least one bundle file per webpack config"));
								// Wait up to 5 seconds for all tests to be defined
								var startTime = Date.now();
								(function() {
									if (exportedTests < filesCount) {
										if (Date.now() - startTime >= 5000) {
											done(new Error("No tests exported by test case"));
										} else {
											setTimeout(arguments.callee, 100);
										}
									} else {
										process.nextTick(done);
									}
								})();
							});
						} catch(err) {
							if (checkExpectedError(isErrorTest, testDirectory, err, done)) {
								console.error(err);
							}
						}
					});
				});
			});
		});
	});
}

function checkExpectedError(isErrorTest, testDirectory, error, done) {
	if (isErrorTest) {
		const expectedError = require(path.join(testDirectory, "expectedError"));
		if (error) {
			if (expectedError.test(error)) {
				done();
			} else {
				done(new Error("Unexpected error message: " + error));
			}
		} else if (expectedError.test) {
			done(new Error("Expected error but test passed."));
		} else {
			// no test function, so test is really expected to pass
			done();
		}
		return true;
	} else if (error) {
		done(error);
		return true;
	}
}

function checkArrayExpectation(testDirectory, object, kind, filename, upperCaseKind, done) {
	if(!done) {
		done = upperCaseKind;
		upperCaseKind = filename;
		filename = `${kind}s`;
	}
	let array = object[`${kind}s`].slice().sort();
	if(kind === "warning") array = array.filter(item => !/from UglifyJs/.test(item));
	if(fs.existsSync(path.join(testDirectory, `${filename}.js`))) {
		const expectedFilename = path.join(testDirectory, `${filename}.js`);
		const expected = require(expectedFilename);
		if(expected.length < array.length)
			return done(new Error(`More ${kind}s while compiling than expected:\n\n${array.join("\n\n")}. Check expected warnings: ${filename}`)), true;
		else if(expected.length > array.length)
			return done(new Error(`Less ${kind}s while compiling than expected:\n\n${array.join("\n\n")}. Check expected warnings: ${filename}`)), true;
		for(let i = 0; i < array.length; i++) {
			if(Array.isArray(expected[i])) {
				for(let j = 0; j < expected[i].length; j++) {
					if(!expected[i][j].test(array[i]))
						return done(new Error(`${upperCaseKind} ${i}: ${array[i]} doesn't match ${expected[i][j].toString()}`)), true;
				}
			} else if(!expected[i].test(array[i]))
				return done(new Error(`${upperCaseKind} ${i}: ${array[i]} doesn't match ${expected[i].toString()}`)), true;
		}
		return done(), true;
	} else if(array.length > 0) {
		return done(new Error(`${upperCaseKind}s while compiling:\n\n${array.join("\n\n")}`)), true;
	}
}
