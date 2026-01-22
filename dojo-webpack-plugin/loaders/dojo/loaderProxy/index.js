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
const loaderUtils = require("loader-utils");
const {callSyncBail} = require("webpack-plugin-compat");

module.exports = function() {
	const dojoRequire = callSyncBail(this._compiler, "get dojo require");
	const issuerAbsMid = this._module.issuer && this._module.issuer.absMid || this._module.absMid || "";
	function toAbsMid(request) {
		return request.split('!').map(part => dojoRequire.toAbsMid(part, {mid:issuerAbsMid})).join('!');
	}
	this.cacheable && this.cacheable();
	const query = this.query ? loaderUtils.parseQuery(this.query) : {};
	const loader = query.loader;
	if (!loader) {
		throw new Error("No loader specified");
	}
	let name = query.name;
	if (!name) {
		if (this._module.absMid) {
			name = this._module.absMid.split("!").pop();
		} else {
			throw new Error(`Dojo Loader Proxy error: No absMid for module ${this._module.request}
 requested with ${this._module.rawRequest}.  Try using a non-relative or non-absolute module
 itentifier (e.g. myPackage/nls/strings.js) for the module or any of it's including modules,
 or else use the 'name' query arg.`);
		}
	}
	if (typeof query.name === 'string') {
		this._module.addAbsMid(`${toAbsMid(loader)}!${toAbsMid(name)}`);
	}
	this._module.filterAbsMids && this._module.filterAbsMids(absMid => {
		return !/loaderProxy/.test(absMid);
	});
	const pluginOptions = callSyncBail(this._compiler, "dojo-webpack-plugin-options");
	const buf = [];
	const runner = require.resolve("../runner.js").replace(/\\/g, "/");
	const req  = `${this._compilation.mainTemplate.requireFn}.${pluginOptions.requireFnPropName}.c()`;
	const deps = (query.deps ? query.deps.split(",") : []).map(dep => {
		dep = decodeURIComponent(dep);
		return `${dep}?absMid=${toAbsMid(dep).replace(/\!/g, "%21")}`;
	});
	buf.push(`define(["${loader}","${runner}","${deps.join("\",\"")}"], function(loader, runner) {`);
	buf.push(`   return runner(loader, "${name}", ${req}, ${(!!pluginOptions.async).toString()});`);
	buf.push('});');

	return buf.join("\n");
};