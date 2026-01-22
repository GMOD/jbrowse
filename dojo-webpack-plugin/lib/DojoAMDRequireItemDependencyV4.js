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
 const DojoAMDRequireItemDependencyBase = require("./DojoAMDRequireItemDependencyBase");

class DojoAMDRequireItemDependencyV4 extends DojoAMDRequireItemDependencyBase {
	getResourceIdentifier() {
		return (this.usingGlobalRequire && this.request.startsWith('.') ? "$$root$$" : "") + super.getResourceIdentifier();
	}

	// Factory
	newRequireItemDependency(dep, issuerModule, props) {
		return new DojoAMDRequireItemDependencyV4(dep, issuerModule, props);
	}
};
DojoAMDRequireItemDependencyV4.Template = DojoAMDRequireItemDependencyBase.Template;

module.exports = DojoAMDRequireItemDependencyV4;