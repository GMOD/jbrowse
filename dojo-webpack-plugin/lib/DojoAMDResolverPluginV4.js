/*
 * (C) Copyright HCL Technologies Ltd. 2018
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
const {tap} = require("webpack-plugin-compat").for("dojo-webpack-plugin");
const DojoAMDResolverPluginBase = require("./DojoAMDResolverPluginBase");

module.exports = class DojoAMDResolverPluginV4 extends DojoAMDResolverPluginBase {
	constructor(options) {
		super();
		this.options = options;
	}

	apply(compiler) {
		this.compiler = compiler;
		tap(compiler.resolverFactory, "resolver normal", resolver => {
			tap(resolver, "module", this.module, Object.create(this, {
				resolver: {value: resolver}
			}), {stage:-1});
		}, this);
	}

	doResolve(obj, message, resolveContext, callback) {
		this.resolver.doResolve(this.resolver.hooks.rawFile, obj, message, resolveContext, callback);
	}
};
