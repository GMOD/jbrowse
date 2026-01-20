/*
 * (C) Copyright HCL Technologies Ltd. 2019
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
const loaderUtils = require("loader-utils");
const i18nEval = require("../i18nEval");
const stringify = require("node-stringify");

const localeRegexp = /^[a-z]{2}([_-]([A-Za-z]{2,4}|[0-9]{3}))?([_-]([A-Za-z]{2,4}|[0-9]{3}))?$/;
/*
 * Modifies the available locales specified in "root" bundles to enable only those locales
 * specified in the bundleLocales query arg.  All other locales will be unavailable.
 */
module.exports = function(content) {
	this.cacheable && this.cacheable();
	const banner = `/*
 * This module was modified by dojo-webpack-plugin to disable some locales
 * that were excluded by the plugin's 'locales' option
 */
`;
	const query = this.query ? loaderUtils.parseQuery(this.query) : {};
	if (typeof query.bundledLocales === 'undefined') {
		return content;
	}

	var bundle;
	try {
		bundle = i18nEval(content);
	} catch(ignore__) {}
	if (!bundle || !bundle.root) {
		return content;
	}

	function isLocaleMatch(a, b) {
		return a === b || a.startsWith(b + '-') || b.startsWith(a + '-');
	}

	const requestedLocales = query.bundledLocales.split("|");
	let modified = false;
	Object.keys(bundle).forEach(bundleLocale => {
		if (bundleLocale === "root" || !localeRegexp.test(bundleLocale)) return;
		if (bundle[bundleLocale]) {
			if (!requestedLocales.find(loc => isLocaleMatch(loc, bundleLocale))) {
				bundle[bundleLocale] = false;
				modified = true;
			}
		}
	});
	return !modified ? content : `${banner}define(${stringify(bundle,null, 1)})`;
};

module.exports.seperable = true;
