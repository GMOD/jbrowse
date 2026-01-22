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

/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * ATTENTION!!! If you make changes to this file that affect the generated code,
 * be sure to update the hash generation function at the end of the file.
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

const Template = require("webpack/lib/Template");
const stringify = require("node-stringify");
const runtime = require("../runtime/DojoAMDMainTemplate.runtime");
const loaderMainModulePatch = require("../runtime/DojoLoaderNonLocalMainPatch.runtime");
const {getAsString, getIndent, getRequireExtensionsHookName, needChunkLoadingCode, preWebpackV4} = require("./compat");
const {reg, tap, pluginName, callSyncBail, callSyncWaterfall} = require("webpack-plugin-compat").for("dojo-webpack-plugin");

module.exports = class DojoAMDMainTemplatePlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		this.compiler = compiler;
		reg(compiler, {"dojoLoader" : ["Sync", "content", "filename"]});
		tap(compiler, {
			"dojo-loader"          : this.dojoLoader,
			"embedded-dojo-loader" : this.embeddedDojoLoader,
			"compilation"        : (compilation, params) => {
			const context = Object.create(this, {
				compilation:{value: compilation},
				params:{value: params},
				indent:{value:getIndent(compilation.chunkTemplate)},
				asString:{value:getAsString(compilation.chunkTemplate)}

			});
			reg(compilation.mainTemplate, {
				"dojo-global-require"      : ["SyncWaterfall", "source"],
				"dojo-require-extensions"  : ["SyncWaterfall", "source", "chunk", "hash"],
				"render-dojo-config-vars"  : ["SyncWaterfall", "loaderScope", "source", "chunk", "hash"]
			});
			const requireExtensionsHookName = getRequireExtensionsHookName(compilation.mainTemplate);
			tap(compilation.mainTemplate, [
				[requireExtensionsHookName, this.requireExtensions],
				["dojo-global-require",     this.dojoGlobalRequire],
				["dojo-require-extensions", this.dojoRequireExtensions],
				["render-dojo-config-vars", this.renderDojoConfigVars],
				["hash",                    this.hash]
			], context);
		}}, this);
	}

	dojoLoader(content, filename) {
		this.dojoLoader = content;
		this.dojoLoaderFilename = filename;
	}

	embeddedDojoLoader(content, filename) {
		this.embeddedLoaderFilename = filename;
		// determine if the embedded loader has the dojo config API
		var scope = callSyncBail(this.compiler, "create-embedded-loader-scope", {packages:[{name:"dojo", location:"./dojo"}]}, content, filename);
		this.embeddedLoaderHasConfigApi = !!scope.require.packs;
	}

	requireExtensions(...args) {
		return callSyncWaterfall(this.compilation.mainTemplate, "dojo-require-extensions", ...args);
	}

	dojoGlobalRequire(source) {
		return source;
	}

	dojoRequireExtensions(source, chunk, ...rest) {
		const {mainTemplate} = this.compilation;
		const [runtimeSource, asyncSource] = ['main', 'async'].map(type => Template.getFunctionContent(runtime[type])
		                           .replace(/__webpack_require__/g, mainTemplate.requireFn)
		                           .replace(/__async__/g, (!!this.options.async).toString()));
		const buf = [];
		buf.push(runtimeSource);
		if (this.options.async) {
			buf.push(asyncSource);
		}
		buf.push("var globalObj = this||window;");
		buf.push("registerAbsMids({");
		buf.push(callSyncWaterfall(this.compilation.chunkTemplate, "render absMids", "", chunk));
		buf.push("});");
		buf.push("");
		buf.push((callSyncWaterfall(mainTemplate, "dojo-global-require", "globalObj.require = req;")));
		if(needChunkLoadingCode(chunk)) {
			const jsonpFn = JSON.stringify(mainTemplate.outputOptions.jsonpFunction);
			buf.push(this.indent(
				`(this||window)[${jsonpFn}].registerAbsMids = registerAbsMids;`
			));
		}
		buf.push("");
		buf.push("// expose the Dojo compatibility functions as a properties of " + mainTemplate.requireFn);
		const djProp = `${mainTemplate.requireFn}.${this.options.requireFnPropName}`;
		buf.push(`if (${djProp}) throw new Error("${djProp} name collision.")`);
		buf.push(`${djProp} = {`);
		buf.push(this.indent([
			"r: req,",
			"c: createContextRequire,",
			"m: dojoModuleFromWebpackModule,",
			"h: resolveTernaryHasExpression,"
		]));
		if (this.options.async) {
			buf.push(this.indent([
				"d: asyncDefineModule,",
				"w: wrapPromises,",
				"u: unwrapPromises"
			]));
		}
		buf.push("};");
		buf.push(`var loaderScope = {document:globalObj.document};`);
		buf.push(`loaderScope.global = loaderScope.window = loaderScope;`);
		const dojoLoaderModule = this.compilation.modules.find((module) => { return module.rawRequest === this.embeddedLoaderFilename;});
		if (!dojoLoaderModule) {
			throw Error("Can't locate " + this.embeddedLoaderFilename + " in compilation");
		}
		buf.push(`globalObj.dojoConfig = globalObj.dojoConfig || {}`);
		var loaderScope;
		if (!this.embeddedLoaderHasConfigApi) {
			if (typeof this.options.loaderConfig !== 'string') {
				let loaderConfig = this.options.loaderConfig;
				if (typeof loaderConfig === 'function') {
					loaderConfig = loaderConfig(this.options.environment || {});
				}
				loaderScope = callSyncBail(this.compiler, "create-dojo-loader-scope", Object.assign({}, loaderConfig), this.dojoLoader, this.dojoLoaderFilename);
			} else {
				throw Error(`The embedded Dojo loader needs the config API in order to support loading the Dojo loader config as a module, \
but the loader specified at ${this.embeddedLoaderFilename} was built without the config API.  Please rebuild the embedded loader with 'dojo-config-api' feature enabled`);
			}
		}
		buf.push(callSyncWaterfall(mainTemplate, "render-dojo-config-vars", loaderScope, "", chunk, ...rest));
		buf.push("var dojoLoader = " + mainTemplate.requireFn + "(" + JSON.stringify(dojoLoaderModule.id) + ");");
		buf.push("dojoLoader.call(loaderScope, userConfig, defaultConfig, loaderScope, loaderScope);");
		if (loaderScope) {
			// loaderProps.baseUrl is set by the loader config renderer if the loader has no config api.
			buf.push("loaderScope.require.baseUrl = " + JSON.stringify(loaderScope.require.baseUrl) + ";");
		}
		buf.push(Template.getFunctionContent(loaderMainModulePatch));
		buf.push("['baseUrl','has','rawConfig','on','signal'].forEach(function(name) {req[name] = loaderScope.require[name]})");
		const loaderConfig = callSyncBail(this.compiler, "get dojo config");
		if (loaderConfig.has && loaderConfig.has['dojo-undef-api']) {
			buf.push("req.undef = " +  Template.getFunctionContent(runtime.undef));
		}
		const makeDeprecatedReq = Template.getFunctionContent(runtime.makeDeprecatedReq)
		                                .replace(/__webpack_require__\.dj/g, djProp);
		return this.asString([
			source,
			`(function() { /* Start ${pluginName} extensions */`,
			this.indent(buf),
			`})(); /* End ${pluginName} extensions */`,
			preWebpackV4(`var req=${makeDeprecatedReq}`)
		]);
	}

	renderDojoConfigVars(loaderScope) {
		// Defines and assigns the defalutConfig and userConfig vars on the client.
		// If loaderScope is defined, then the embedded Dojo loader does not include the config API and so
		// the post-processed properties exported in the loaderScope should be used to specify the default config
		var defaultConfig = {hasCache:this.getDefaultFeatures()};
		const {mainTemplate} = this.compilation;
		const buf = [];
		// loader config props duplicated in default config when not using config api
		if (typeof this.options.loaderConfig === 'string') {
			const dojoLoaderConfig = this.compilation.modules.find((module) => { return module.rawRequest === this.options.loaderConfig;});
			buf.push(`var userConfig = ${mainTemplate.requireFn}(${JSON.stringify(dojoLoaderConfig.id)});`);
			buf.push(`if (typeof userConfig === 'function') {`);
			buf.push(this.indent(`userConfig = userConfig.call(globalObj, ${stringify(this.options.environment || {})});`));
			buf.push("}");
		} else {
			var loaderConfig = this.options.loaderConfig;
			if (typeof loaderConfig === 'function') {
				loaderConfig = loaderConfig(this.options.environment || {});
			}
			if (loaderScope) {
				// make a working copy of the config for us to modify
				loaderConfig = Object.assign({}, loaderConfig);

				// Items to copy from the require object to the default config
				["paths", "pathsMapProg", "packs", "aliases", "mapProgs",  "cacheBust"].forEach(prop => {
					defaultConfig[prop] = loaderScope.require[prop];
				});
				["modules", "cache"].forEach(prop => {
					defaultConfig[prop] = {};
				});
				// Remove packages defined by the loader default config
				["dojo", "dijit", "dojox", "tests", "doh", "build", "demos"].forEach(prop => {
					if (!loaderConfig.packages || !loaderConfig.packages.find(pack => {return pack.name === prop;})) delete defaultConfig.packs[prop];
				});
				// Remove duplicated/redundant items from the user config since they are not needed by Dojo.
				["paths", "packages", "aliases", "maps", "cacheBust"].forEach(prop => {
					delete loaderConfig[prop];
				});
				defaultConfig.hasCache = this.getDefaultFeatures();
			}
			buf.push(`var userConfig = mix(globalObj.dojoConfig, ${stringify(loaderConfig)});`);
		}
		buf.push(`var defaultConfig = ${stringify(defaultConfig)};`);
		return this.asString(buf);
	}

	hash(hash) {
		const {options} = this;
		hash.update("DojoAMDMainTemplate");
		hash.update("11");		// Increment this whenever the template code above changes
		if (typeof options.loaderConfig === 'string') {
			hash.update(options.loaderConfig);	// loading the config as a module, so any any changes to the
																					//   content will be detected at the module level
		} else if (typeof options.loaderConfig === 'function') {
			hash.update(stringify(options.loaderConfig(options.environment || {})));
		} else {
			hash.update(stringify(options.loaderConfig));
		}
	}

	getDefaultFeatures() {
		return require("./defaultFeatures");
	}
};
