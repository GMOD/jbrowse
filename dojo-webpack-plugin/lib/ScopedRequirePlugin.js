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
const {tap, callSyncBail} = require("webpack-plugin-compat").for("ScopedRequirePlugin");
const {getModuleTemplate} = require("./compat");
const ConcatSource = require("webpack-sources").ConcatSource;

module.exports = class ScopedRequirePlugin {
	apply(compiler) {
		tap(compiler, "compilation", compilation => {
			tap(compilation.mainTemplate, "dojo global require", () => {
				return "";	// don't set global require
			});
			const template = getModuleTemplate(compilation);
			tap(template, "render", (source, module) => {
				var result = source;
				if (module.isAMD) {
					// Define a module scoped 'require' variable for AMD modules that references the
					// the Dojo require function.
					result = new ConcatSource();
					const options = callSyncBail(compiler, "dojo-webpack-plugin-options");
					result.add(`var require = ${compilation.mainTemplate.requireFn}.${options.requireFnPropName}.r;`);
					result.add(source);
				}
				return result;
			});
		});
	}
};
