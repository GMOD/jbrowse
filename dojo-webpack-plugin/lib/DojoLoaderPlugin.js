/*
 * (C) Copyright HCL Technologies Ltd. 2018, 2019
 * (C) Copyright IBM Corp. 2017 All Rights Reserved.
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
const path = require('path');
const fs = require('fs');
const vm = require("vm");
const Template = require("webpack/lib/Template");
const loaderMainModulePatch = require("../runtime/DojoLoaderNonLocalMainPatch.runtime");
const {reg, tap, callSync, callSyncBail} = require("webpack-plugin-compat").for("dojo-webpack-plugin");
const {containsModule} = require("./compat");
const CommonJsRequireDependency = require("webpack/lib/dependencies/CommonJsRequireDependency");
const ConstDependency = require("webpack/lib/dependencies/ConstDependency");
const BasicEvaluatedExpression = require("webpack/lib/BasicEvaluatedExpression");
const buildLoader = require("../buildDojo/buildapi");

const embeddedLoaderFilenameExpression = "__embedded_dojo_loader__";

module.exports = class DojoLoaderPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		this.compiler = compiler;
		reg(this.compiler, {
			"get dojo require" : ["SyncBail"],
			"get dojo config" : ["SyncBail"],
			"embedded-dojo-loader" : ["Sync", "content", "filename"],
			"create-dojo-loader-scope" : ["SyncBail", "loaderConfig", "loader", "filename"],
			"create-embedded-loader-scope" : ["SyncBail", "userConfig", "embeddedLoader", "filename"]
		});
		tap(compiler, [
			[["run", "watch-run"],           this.run1],
			[["run", "watch-run"],           this.run2],
			["get dojo require",             this.getDojoRequire],
			["get dojo config",              this.getBuildLoaderConfig],
			["embedded-dojo-loader",         this.embeddedDojoLoader],
			["create-dojo-loader-scope",     this.createLoaderScope],
			["create-embedded-loader-scope", this.createEmbeddedLoaderScope]
		], this);
		tap(compiler, "compilation", (compilation, params) => {
			const context = Object.create(this, {
				compilation:{value: compilation},
				params:{value: params}
			});
			tap(compilation, [
				["succeed-module",        this.succeedModule],
				["after-optimize-chunks", this.afterOptimizeChunks]
			], context);
			// Support for the __embedded_dojo_loader__ webpack variable.  This allows applications (and unit tests)
			// to require the embedded loader module with require(__embedded_dojo_loader__);
			tap(params.normalModuleFactory, "parser", parser => {
				tap(parser, [
					[`expression ${embeddedLoaderFilenameExpression}`,          this.expressionLoader],
					[`evaluate typeof ${embeddedLoaderFilenameExpression}`,     this.evaluateTypeofLoader],
					[`evaluate Identifier ${embeddedLoaderFilenameExpression}`, this.evaluateIdentifierLoader],
					// Ensure that the embedded loader doesn't pull in node dependencies for process and global
					[["expression process", "expression global"],               this.expressionNode]
				], Object.create(context, {parser: {value: parser}}));
			});
		});
	}

	getDojoPath(loaderConfig) {
		var dojoPath;
		if (!loaderConfig.packages || !loaderConfig.packages.some((pkg) => {
			if (pkg.name === "dojo") {
				return dojoPath = path.resolve(loaderConfig.baseUrl, pkg.location);
			}
		})) {
			return path.join(require.resolve("dojo/dojo.js"), "..");
		}
		return dojoPath;
	}

	getOrCreateEmbeddedLoader(dojoPath, loaderConfig, options, callback) {
		var dojoLoaderPath;
		if (options.loader) {
			try {
				 dojoLoaderPath = require.resolve(options.loader);
				 fs.readFile(dojoLoaderPath, "utf-8", (err, content) => {
					 return callback(err, content);
				 });
			} catch (error) {
				return callback(error);
			}
		} else {
			if (!options.noConsole) {
				console.log("Dojo loader not specified in options.  Building the loader...");
			}
			const tmp = require("tmp");
			// create temporary directory to hold output
			tmp.dir({unsafeCleanup: true}, (err, tempDir) => {
				if (err) {
					return callback(err);
				}
				const featureOverrides = {};
				if (typeof options.loaderConfig !== 'string') {
					// If config is not a module, then honor the 'dojo-config-api' has feature if specified
					if (loaderConfig.has && ('dojo-config-api' in loaderConfig.has) && !loaderConfig.has['dojo-config-api']) {
						featureOverrides['dojo-config-api'] = 0;
					}
				}
				buildLoader({
					dojoPath: path.resolve(loaderConfig.baseUrl, dojoPath, "./dojo"), 	// path to dojo.js
					releaseDir: tempDir,	// target location
					has: featureOverrides,
					noConsole: options.noConsole
				}).then(() => {
					options.loader = path.join(tempDir, "dojo/dojo.js");
					dojoLoaderPath = require.resolve(path.join(options.loader));
					fs.readFile(dojoLoaderPath, "utf-8", (err, content) => { // eslint-disable-line no-shadow
						callback(err, content);
					});
				}).catch(err => { // eslint-disable-line no-shadow
					callback(err);
				});
			});
		}
	}

	createLoaderScope(loaderConfig, loader, filename) {
		const loaderScope = {};
		loaderScope.global = loaderScope.window = loaderScope;
		loaderScope.dojoConfig = Object.assign({}, loaderConfig);
		loaderScope.dojoConfig.has = Object.assign({}, this.getDefaultFeaturesForEmbeddedLoader(), loaderScope.dojoConfig.has, {"dojo-config-api":1, "dojo-publish-privates":1});
		var context = vm.createContext(loaderScope);
		const patch = "(function(loaderScope){" + Template.getFunctionContent(loaderMainModulePatch) + "})(global);";
		vm.runInContext('(function(global, window) {' + loader + patch + '});', context, filename).call(context, context);
		return loaderScope;
	}

	createEmbeddedLoaderScope(userConfig, embeddedLoader, filename) {
		const loaderScope = {};
		const defaultConfig = {hasCache:{}, modules:{}};
		loaderScope.global = loaderScope.window = loaderScope;
		var context = vm.createContext(loaderScope);
		vm.runInContext("var module = {};" + embeddedLoader, context, filename).call(context, userConfig, defaultConfig, context, context);
		return loaderScope;
	}

	getBuildLoaderConfig() {
		var loaderConfig = this.options.loaderConfig;
		if (typeof loaderConfig === 'string') {
			loaderConfig = require(loaderConfig);
		}
		if (typeof loaderConfig === 'function') {
			loaderConfig = loaderConfig(this.options.buildEnvironment || this.options.environment || {});
		}
		loaderConfig.baseUrl = path.resolve(this.compiler.context, loaderConfig.baseUrl || ".").replace(/\\/g, "/");
		return loaderConfig;
	}

	run1(__, callback) {
		// Load the Dojo loader and get the require function into loaderScope
		var loaderConfig = callSyncBail(this.compiler, "get dojo config");
		var dojoPath;
		try {
			dojoPath = this.getDojoPath(loaderConfig);
		} catch (e) {
			return callback(e);
		}
		var filename = path.join(dojoPath, "dojo.js");
		fs.readFile(filename, 'utf-8', (err, content) => {
			if (err) return callback(err);
			callSync(this.compiler, "dojo-loader", content, filename);
			this.loaderScope = callSyncBail(this.compiler, "create-dojo-loader-scope", loaderConfig, content, filename);
			return callback();
		});
	}

	run2(__, callback) {
		// Load the Dojo loader and get the require function into loaderScope
		var loaderConfig = callSyncBail(this.compiler, "get dojo config");
		var dojoPath;
		try {
			dojoPath = this.getDojoPath(loaderConfig);
		} catch (e) {
			return callback(e);
		}
		this.getOrCreateEmbeddedLoader(dojoPath, loaderConfig, this.options, (err, content) => {
			// options.loader specifies path to the embedded loader (set by createEmbeddedLoader if created)
			if (!err) {
				callSync(this.compiler, "embedded-dojo-loader", content, this.options.loader);
			}
			callback(err);
		});
	}

	getDojoRequire() {
		return this.loaderScope.require;
	}

	embeddedDojoLoader(content, filename) {
		this.embeddedLoader = content;
		this.embeddedLoaderFilename = filename;
	}

	succeedModule(module) {
		const {options} = this;
		if (!module.issuer) {
			// No issuer generally means an entry module, so add a Dojo loader dependency.  It doesn't
			// hurt to add extra dependencies because the Dojo loader module will be removed from chunks
			// that don't need it in the 'after-optimize-chunks' handler below.
			module.addDependency(new CommonJsRequireDependency(options.loader));
			if (typeof options.loaderConfig === 'string') {
				module.addDependency(new CommonJsRequireDependency(options.loaderConfig));
			}
		}
	}

	afterOptimizeChunks(chunks) {
		// Get the loader and loader config
		const {options, compilation} = this;
		const loaderModule = compilation.modules.find((module) => { return module.rawRequest === options.loader;});
		const configModule = typeof options.loaderConfig === 'string' &&
								compilation.modules.find((module) => { return module.rawRequest === options.loaderConfig;});

		// Ensure that the Dojo loader, and optionally the loader config, are included
		// only in the entry chunks that contain the webpack runtime.
		chunks.forEach((chunk) => {
			if (chunk.hasRuntime()) {
				if (!loaderModule) {
					throw Error("Can't locate " + options.loader + " in compilation");
				}
				if (typeof options.loaderConfig === 'string' && !configModule) {
					throw Error("Can't locate " + options.loaderConfig + " in compilation");
				}
				if (!containsModule(chunk, loaderModule)) {
					chunk.addModule(loaderModule);
					loaderModule.addChunk(chunk);
				}
				if (configModule && !containsModule(chunk, configModule)) {
					chunk.addModule(configModule);
					configModule.addChunk(chunk);
				}
			} else if (loaderModule) {
				if (containsModule(chunk, loaderModule)) {
					chunk.removeModule(loaderModule);
					loaderModule.removeChunk(chunk);
				}
				if (configModule && containsModule(chunk, configModule)) {
					chunk.removeModule(configModule);
					configModule.removeChunk(chunk);
				}
			}
		});
	}

	expressionLoader(expr) {
		// change __embedded_dojo_loader__ expressions in the source to the filename value as a string.
		const {parser} = this;
		const fn = callSyncBail(parser, `evaluate Identifier ${embeddedLoaderFilenameExpression}`, expr).string.replace(/\\/g, "\\\\");
		const dep = new ConstDependency("\"" + fn + "\"", expr.range);
		dep.loc = expr.loc;
		parser.state.current.addDependency(dep);
		return true;
	}

	evaluateTypeofLoader(expr) {
		// implement typeof operator for the expression
		var result = new BasicEvaluatedExpression().setString("string");
		if (expr) {
			result.setRange(expr.range);
		}
		return result;
	}

	evaluateIdentifierLoader(expr) {
		var result = new BasicEvaluatedExpression().setString(this.embeddedLoaderFilename);
		if (expr) {
			result.setRange(expr.range);
		}
		return result;
	}

	expressionNode() {
		const {parser} = this;
		const embeddedLoaderFileName = callSyncBail(parser, `evaluate Identifier ${embeddedLoaderFilenameExpression}`).string;
		if(parser.state.module && parser.state.module.request === embeddedLoaderFileName) {
			return false;
		}
	}

	getDefaultFeaturesForEmbeddedLoader() {
		return require("../buildDojo/loaderDefaultFeatures");
	}
};
