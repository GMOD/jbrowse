/*
 * (C) Copyright HCL Technologies Ltd. 2018
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
const {tap, callSyncBail} = require("webpack-plugin-compat").for("dojo-webpack-plugin");

module.exports = class DojoLoaderValidatorPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		this.compiler = compiler;
		tap(compiler, {
			"compile":               params => this.params = params,
			"embedded-dojo-loader":  this.embeddedDojoLoader,
			"make":                  this.validateEmbeddedLoader
		}, this);
	}

	embeddedDojoLoader(content, filename) {
		this.embeddedLoader = content;
		this.embeddedLoaderFilename = filename;
	}

	validateEmbeddedLoader(compilation, callback) {
		if (compilation.compiler !== this.compiler) {
			// Don't do this for child compilations
			//  https://github.com/OpenNTF/dojo-webpack-plugin/issues/115
			return callback();
		}
		// Vefiry that embedded loader version and dojo version are the same
		this.params.normalModuleFactory.create({
			dependencies: [{request: "dojo/package.json"}]
		}, (err, pkgModule) => {
			if (!err) {
				 const pkg = require(pkgModule.request);
				 if (pkg.name !== 'dojo') {
					 err = new Error(`Expected package.json for 'dojo' at '${pkgModule.request}' but found '${pkg.name}' instead.`);
				 }
				 const dojoVersion = pkg.version;
				 const scope = callSyncBail(this.compiler, "create-embedded-loader-scope", {}, this.embeddedLoader, this.filename);
				 if (!err && dojoVersion !== scope.loaderVersion) {
					 err = new Error(
`Dojo loader version does not match the version of Dojo.
Loader version = ${scope.loaderVersion}.
Dojo version = ${dojoVersion}.
You may need to rebuild the Dojo loader.
Refer to https://github.com/OpenNTF/dojo-webpack-plugin/blob/master/README.md#building-the-dojo-loader`);
				 }
				 return callback(err, scope);
			}
			callback(err);
		});
	}
};
