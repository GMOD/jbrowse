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
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
const DojoAMDDependencyParserMixin = require("./DojoAMDDependencyParserMixin");
const DojoAMDRequireDependenciesBlock = require("./DojoAMDRequireDependenciesBlock");
const {tap} = require("webpack-plugin-compat").for("dojo-webpack-plugin");
const AMDRequireDependenciesBlockParserPlugin = require("webpack/lib/dependencies/AMDRequireDependenciesBlockParserPlugin");

module.exports = class DojoAMDRequireDependenciesBlockParserPluginV4 extends
DojoAMDDependencyParserMixin(AMDRequireDependenciesBlockParserPlugin) {
	constructor(options) {
		super({});
		this.options = options;
		this.verb = "require";
	}

	apply(parser) {
		tap(parser, {
			"call require" : this.processCallRequire.bind(this, parser),
			"expression require" : this.expressionRequire
		});
	}

	newRequireDependenciesBlock(...args) {
		return new DojoAMDRequireDependenciesBlock(...args);
	}
};
