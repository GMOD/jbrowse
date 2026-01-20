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
const WebpackMissingModule = require("webpack/lib/dependencies/WebpackMissingModule");

module.exports = superclass => class extends superclass {

	contentForFeatureExpression(dep, comment) {
		var expr;
		comment = comment ? `/*! ${dep.originalRequest} */ ` : "";
		try {
			// replace the %%# positional arguments in the feature expression with the corresponding module ids from the
			// dependencies array.
			expr = dep.featureExpression.replace(/%%(\d+)/g, (match__, p) => {
				const module = dep.featureDeps[p].module;
				if (module) {
					return module.id;
				} else {
					throw new Error(dep.featureDeps[p].request);
				}
			});
		} catch (err) {
			return comment + WebpackMissingModule.module(err.message);
		}
		return `${dep.djProp}.h(${comment}"${expr}")`;
	}
};