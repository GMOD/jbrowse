/*
 * (C) Copyright HCL Technologies Ltd. 2018, 2019
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
const path = require("path");
const {tap,reg} = require("webpack-plugin-compat").for("dojo-webpack-plugin");
const DojoAMDDefineDependency = require("./DojoAMDDefineDependency");
const DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
const NormalModuleReplacementPlugin = require("webpack/lib/NormalModuleReplacementPlugin");
const NullFactory = require("webpack/lib/NullFactory");

const DojoAMDRequireDependenciesBlockParserPlugin = require("./DojoAMDRequireDependenciesBlockParserPlugin");
const DojoAMDDefineDependencyParserPlugin = require("./DojoAMDDefineDependencyParserPlugin");
const DojoAMDResolverPlugin = require("./DojoAMDResolverPlugin");
const DojoAMDMiscParserPlugin = require("./DojoAMDMiscParserPlugin");
const DojoAMDMainTemplatePlugin = require("./DojoAMDMainTemplatePlugin");
const DojoAMDChunkTemplatePlugin = require("./DojoAMDChunkTemplatePlugin");
const DojoAMDModuleFactoryPlugin = require("./DojoAMDModuleFactoryPlugin");
const DojoLoaderPlugin = require("./DojoLoaderPlugin");
const DojoLoaderValidatorPlugin = require("./DojoLoaderValidatorPlugin");
const DojoAMDRequireArrayDependency =  require("./DojoAMDRequireArrayDependency");
const ScopedRequirePlugin = require("./ScopedRequirePlugin");
const {applyResolverPlugin} = require("./compat");
const [major, minor, patch] = require('webpack/package.json').version.split('.').map(v => parseInt(v));
const DojoAMDRequireDependency = major >= 4 ? require("./DojoAMDRequireDependency") : null;

module.exports = class DojoAMDPlugin {
	constructor(options) {
		options.requireFnPropName = options.requireFnPropName || "dj";
		this.options = options;
		this.options.getGlobalContext = this.getGlobalContext.bind(this);
	}

	apply(compiler) {
		if (this.options.async) {
			// If async option specified, make sure we have the right version of webpack
			if (major < 4 || major === 4 && (minor < 28 || minor === 28 && patch < 4)) {
				// Need at least 4
				throw new Error("Async mode requires webpack 4.28.4 or greater.");
			}
		}
		this.compiler = compiler;
		reg(compiler, "dojo-webpack-plugin-options", ["SyncBail"]);
		tap(compiler, "dojo-webpack-plugin-options", () => this.options);
		applyResolverPlugin(this.options, compiler, this.newResolverPlugin);
		this.newDojoLoaderPlugin(this.options).apply(compiler);
		this.newDojoLoaderValidatorPlugin(this.options).apply(compiler);
		this.newMainTemplatePlugin(this.options).apply(compiler);
		this.newChunkTemplatePlugin(this.options).apply(compiler);
		this.newModuleFactoryPlugin(this.options).apply(compiler);

		tap(compiler, "compilation", this.compilationPlugins, this);
		this.normalModuleReplacements();

		this.setAliases(compiler);
	}

	compilationPlugins(compilation, params) {
		compilation.dependencyFactories.set(DojoAMDRequireItemDependency, params.normalModuleFactory);
		compilation.dependencyTemplates.set(DojoAMDRequireItemDependency, this.newRequireItemDependencyTemplate(this.options));

		compilation.dependencyFactories.set(DojoAMDDefineDependency, new NullFactory());
		compilation.dependencyTemplates.set(DojoAMDDefineDependency, this.newDefineDependencyTemplate(this.options));

		if (DojoAMDRequireDependency) {
			compilation.dependencyFactories.set(DojoAMDRequireDependency, new NullFactory());
			compilation.dependencyTemplates.set(DojoAMDRequireDependency, this.newRequireDependencyTemplate(this.options));
		}

		compilation.dependencyFactories.set(DojoAMDRequireArrayDependency, new NullFactory());
		compilation.dependencyTemplates.set(DojoAMDRequireArrayDependency, this.newRequireArrayDependencyTemplate(this.options));

		tap(params.normalModuleFactory, {"parser": this.parserPlugins}, this);

		tap(compilation, "seal", () => {
			const factories = compilation.dependencyFactories;
			const factory = Array.from(factories.keys()).find(key => key.prototype.constructor.name === 'I18nExtractorItemDependency');
			if (factory) {
				let major = 0, minor = 0, patch = 0; // eslint-disable-line no-shadow
				if (factory.version) {
					[major, minor, patch] = factory.version.split('.').map(num => parseInt(num));
				}
				if (major < 2 || major === 2 && minor === 0 && patch < 6) {
					throw new Error(`You are using a down level version of webpack-i18n-extractor-plugin which is not compatible with the current version of dojo-webpack-plugin.
Please upgrade webpack-i18n-extractor-plugin to the latest version.`);
				}
			}
		});

	}

	parserPlugins(parser) {
		this.newRequireDependenciesBlockParserPlugin(this.options).apply(parser);
		this.newDefineDependencyParserPlugin(this.options).apply(parser);
		this.newDojoAMDMiscParserPlugin(this.options).apply(parser);
		tap(parser, ["expression process", "expression global"], this.expressionNode.bind(this, parser));
	}

	normalModuleReplacements() {
		new NormalModuleReplacementPlugin(/^dojo\/selector\/_loader!default$/, "dojo/selector/lite").apply(this.compiler);
		new NormalModuleReplacementPlugin(/^dojo\/request\/default!/, "dojo/request/xhr").apply(this.compiler);
		new NormalModuleReplacementPlugin(/^dojo\/query!/, data => {
			var match = /^dojo\/query!(.*)$/.exec(data.request);
			data.request = `dojo/loaderProxy?loader=dojo/query&name=${match[1]}&absMid=dojo/query%21${match[1]}!`;
		}).apply(this.compiler);
	}

	setAliases(compiler) {
		// Add resolveLoader config entry
		const resolveLoader = compiler.options.resolveLoader = compiler.options.resolveLoader || {};
		const alias = resolveLoader.alias = resolveLoader.alias || {};
		alias['dojo/text'] = path.resolve(__dirname, "..", "loaders", "dojo", "text");
		alias['dojo/i18n'] = path.resolve(__dirname, "..", "loaders", "dojo", "i18n");
		alias['dojo/i18nRootModifier'] = path.resolve(__dirname, "..", "loaders", "dojo", "i18nRootModifier");
		alias['dojo/loaderProxy'] = path.resolve(__dirname, "..", "loaders", "dojo", "loaderProxy");
	}

	getGlobalContext(compiler) {
		var context = '.';
		if (typeof this.options.globalContext === 'string') {
			context = this.options.globalContext;
		} else if (typeof this.options.globalContext === 'object') {
			context = this.options.globalContext.context || '.';
		}
		return path.resolve(compiler.context, context);
	}

	expressionNode(parser) {
		// Don't pull in node modules for node type references (e.g. process, global) in dojo modules.
		if(parser.state.module && parser.state.module.request && /[/\\](dojo|dijit|dojox)[/\\]/.test(parser.state.module.request)) {
			return false;
		}
	}
	// Factories
	newDojoLoaderPlugin(options) {
		return new DojoLoaderPlugin(options);
	}
	newDojoLoaderValidatorPlugin(options) {
		return new DojoLoaderValidatorPlugin(options);
	}
	newMainTemplatePlugin(options) {
		return new DojoAMDMainTemplatePlugin(options);
	}
	newChunkTemplatePlugin(options) {
		return new DojoAMDChunkTemplatePlugin(options);
	}
	newRequireItemDependencyTemplate(options) {
		return new DojoAMDRequireItemDependency.Template(options);
	}
	newDefineDependencyTemplate(options) {
		return new DojoAMDDefineDependency.Template(options);
	}
	newRequireDependencyTemplate(options) {
		return new DojoAMDRequireDependency.Template(options);
	}
	newRequireArrayDependencyTemplate(options) {
		return new DojoAMDRequireArrayDependency.Template(options);
	}
	newModuleFactoryPlugin(options) {
		return new DojoAMDModuleFactoryPlugin(options);
	}
	newResolverPlugin(options, compiler) {
		return new DojoAMDResolverPlugin(options, compiler);
	}
	newRequireDependenciesBlockParserPlugin(options, parser) {
		return new DojoAMDRequireDependenciesBlockParserPlugin(options, parser);
	}
	newDefineDependencyParserPlugin(options, parser) {
		return new DojoAMDDefineDependencyParserPlugin(options, parser);
	}
	newDojoAMDMiscParserPlugin(options, parser) {
		return new DojoAMDMiscParserPlugin(options, parser);
	}
};
module.exports.ScopedRequirePlugin = ScopedRequirePlugin;
module.exports.buildLoader = require('../buildDojo/buildapi');
