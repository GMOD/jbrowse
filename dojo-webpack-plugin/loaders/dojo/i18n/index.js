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
const i18nEval = require("../i18nEval");
const {callSyncBail} = require("webpack-plugin-compat");

module.exports = function(content) {
	this.cacheable && this.cacheable();

	// Returns the locales that are enabled in bundle which match the requested locale
	// A locale matches the requested locale if it is the same, or more/less specific than
	// the requested locale.  For example if the requested locale is en-us, then bundle
	// locales en and en-us and en-us-xyz all match.
	function getAvailableLocales(requestedLocale, bundle) {
		/* istanbul ignore if */
		if (!bundle.root || typeof bundle.root !== 'object') {
			return [];
		}
		if (requestedLocale === "*") {
			return Object.keys(bundle).filter(locale => {
				return locale !== "root" && !!bundle[locale];
			});
		}
		var result = [], parts = requestedLocale.split("-");
		// Add root locales (less spcific) first
		for (var current = "", i = 0; i < parts.length; i++) {
			current += (current ? "-" : "") + parts[i];
			if(bundle[current]){
				result.push(current);
			}
		}
		// Add locales with greater specificity
		Object.keys(bundle).forEach(function(loc) {
			if (bundle[loc] && loc.startsWith(requestedLocale + "-")) {
				result.push(loc);
			}
		});
		return result;
	}

	// Webpack loader replacements for Dojo loader plugins should provide
	// an absMid for the module.  For this loader, the default absMid(s) will do,
	// but the default absMids are provisional and won't be exported to the client
	// unless we make them non-provisional.  This is done with following call.
	this._module.addAbsMid();
	if (!this._module.absMid) {
		throw new Error(`Dojo i18n loader error: No absMid for module ${this._module.request}
 requested with ${this._module.rawRequest}.  Try using a non-relative or non-absolute module
 itentifier (e.g. myPackage/nls/strings.js) for the module or any of it's including modules.`);
	}

	var bundle = i18nEval(content);
	var absMid = this._module.absMid.split("!").pop();
	var res = this._module.request.replace(/\\/g, "/").split("!").pop();

	// Determine if this is the default bundle or a locale specific bundle
	const buf = [], deps = [], regex = /^(.+)\/nls\/([^/]+)\/?(.*?)$/;
	const resMatch = regex.exec(res);
	const pluginOptions = callSyncBail(this._compiler, "dojo-webpack-plugin-options");
	const requestedLocales = pluginOptions.locales;
	const bundledLocales = [];

	if (!resMatch) {
		throw new Error(`Unsupported resource path for dojo/i18n loader.  ${res} must be in an nls directory`);
	}
	var locale;
	if (resMatch[3]) {
		locale = resMatch[2];
	}
	if (!locale) {
		// this is the default bundle.  Add any locale specific bundles that match the
		// requested locale.  Default bundles specify available locales
		let absMidMatch = regex.exec(absMid);
		(requestedLocales || ["*"]).forEach(requestedLocale => {
			const availableLocales = getAvailableLocales(requestedLocale, bundle);
			availableLocales.forEach(loc => {
				const localeRes = `${resMatch[1]}/nls/${loc}/${resMatch[2]}`;
				var localeAbsMid;
				if (absMidMatch) {
					localeAbsMid = `${absMidMatch[1]}/nls/${loc}/${absMidMatch[2]}`;
				} else {
					localeAbsMid = path.relative(this._compiler.context, localeRes).replace(/[\\]/g, '/');
				}
				if (localeAbsMid.endsWith('.js')) {
					localeAbsMid = localeAbsMid.substring(0, localeAbsMid.length-3);
				}
				bundledLocales.push(loc);
				deps.push(`${localeRes}?absMid=${localeAbsMid}`);
			});
		});

	}
	const runner = require.resolve("../runner.js").replace(/\\/g, "/");
	deps.push(`${res}?absMid=${absMid}`);
	const req = `${this._compilation.mainTemplate.requireFn}.${pluginOptions.requireFnPropName}.c()`;
	buf.push(`define(["dojo/i18n", "${runner}"`);
	deps.forEach(dep => buf.push(`,"${dep}"`));
	buf.push('], function(loader, runner) {');
	buf.push(`   return runner(loader, "${absMid}", ${req}, ${(!!pluginOptions.async).toString()});`);
	buf.push('});');
	return buf.join("\n");
};

module.exports.seperable = true;
