/*
 * (C) Copyright HCL Technologies Ltd. 2018, 2019
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
const AMDRequireDependency = require("webpack/lib/dependencies/AMDRequireDependency");

class SourceWrapper {
	constructor(source, options) {
		this.options = options;
		this.source = source;
	}
	replace(start, end, newValue, ...rest) {
		const djProp = `__webpack_require__.${this.options.requireFnPropName}`;
		if (newValue === "; (") {
			newValue = `; Promise.all(${djProp}.w(__WEBPACK_AMD_REQUIRE_ARRAY__)).then(function(deps) {return (`;
		}
		this.source.replace(start, end, newValue, ...rest);
	}
	insert(pos, newValue, ...rest) {
		const djProp = `__webpack_require__.${this.options.requireFnPropName}`;
		if (newValue === ").apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);") {
			newValue = `).apply(null, ${djProp}.u(deps))}.bind(this));`;
		}
		this.source.insert(pos, newValue, ...rest);
	}
};

class DojoAMDRequireDependency extends AMDRequireDependency {}

DojoAMDRequireDependency.prototype.type = "amd require";

DojoAMDRequireDependency.Template = class DojoAMDRequireDependencyTemplate extends AMDRequireDependency.Template {

	constructor(options) {
		super();
		this.options = options;
	}

	apply(dependency, source, ...rest) {
		return super.apply(dependency, this.options.async ? new SourceWrapper(source, this.options) : source, ...rest);
	}
};


module.exports = DojoAMDRequireDependency;
