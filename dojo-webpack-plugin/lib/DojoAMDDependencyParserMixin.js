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
/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
const {callSyncBail} = require("webpack-plugin-compat");
const {getRenameFor} = require("./compat");
const DojoAMDRequireItemDependency = require("./DojoAMDRequireItemDependency");
const DojoAMDDefineDependency = require("./DojoAMDDefineDependency");
const DojoAMDRequireArrayDependency = require("./DojoAMDRequireArrayDependency");
const ConstDependency = require("webpack/lib/dependencies/ConstDependency");
const LocalModuleDependency = require("webpack/lib/dependencies/LocalModuleDependency");
const LocalModulesHelpers = require("webpack/lib/dependencies/LocalModulesHelpers");


module.exports = superclass => class extends superclass {

	processArray(parser, expr, param, identifiers, namedModule) {
		if(param.isArray()) {
			param.items.forEach((param, idx) => { // eslint-disable-line no-shadow
				if(param.isString()) {
					if (["require", "module", "exports"].indexOf(param.string) >= 0) {
						if (identifiers) identifiers[idx] = param.string;
					}
				}
				this.processItem(parser, expr, param, namedModule);
			});
			return true;
		} else if(param.isConstArray()) {
			const deps = [];
			const djProp = `${parser.state.compilation.mainTemplate.requireFn}.${this.options.requireFnPropName}`;
			param.array.forEach((request, idx) => {
				let dep, localModule;
				if (request === "require") {
					if (identifiers) identifiers[idx] = request;
					dep = `${djProp}.c(module.i)`;
				} else if (request === "module") {
					if (identifiers) identifiers[idx] = request;
					dep = `${djProp}.m(module)`;
				} else if(request === "exports") {
					if (identifiers) identifiers[idx] = request;
					dep = request;
				} else if(localModule = LocalModulesHelpers.getLocalModule(parser.state, request)) { // eslint-disable-line no-cond-assign
					dep = new LocalModuleDependency(localModule);
					dep.loc = expr.loc;
					parser.state.current.addDependency(dep);
				} else {
					var dojoRequire = callSyncBail(parser.state.compilation.compiler, "get dojo require");
					const props = {
						options: this.options,
						require:dojoRequire,
						djProp: djProp
					};
					if (this.verb === "require" && getRenameFor(parser, expr.callee.name) !== "require") {
						props.usingGlobalRequire = true;
					}
					dep = this.newRequireItemDependency(request, parser.state.current, props);
					dep.loc = expr.loc;
					dep.optional = !!parser.scope.inTry;
					parser.state.current.addDependency(dep);
				}
				deps.push(dep);
			});
			const dep = this.newRequireArrayDependency(deps, param.range);
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
			return true;
		}
		super.processArray && super.processArray(parser, expr, param, identifiers, namedModule);
	}

	processItem(parser, expr, param, namedModule) {
		if (param.isConditional && param.isConditional()) {
			return super.processItem(parser, expr, param, namedModule);
		}
		const djProp = `${parser.state.compilation.mainTemplate.requireFn}.${this.options.requireFnPropName}`;
		if(param.isString()) {
			let dep, localModule;
			if (param.string === "require") {
				dep = new ConstDependency(`${djProp}.c(module.i)`, param.range);
			} else if (param.string === "module") {
				dep = new ConstDependency(`${djProp}.m(module)`, param.range);
			} else if (param.string === "exports") {
				dep = new ConstDependency(param.string, param.range);
			} else if(localModule = LocalModulesHelpers.getLocalModule(parser.state, param.string, namedModule)) { // eslint-disable-line no-cond-assign
				dep = new LocalModuleDependency(localModule, param.range);
			} else {
				var dojoRequire = callSyncBail(parser.state.compilation.compiler, "get dojo require");
				const props = {
					options:this.options,
					require:dojoRequire,
					djProp: djProp
				};
				if (this.verb === "require" && getRenameFor(parser, expr.callee.name) !== "require") {
					props.usingGlobalRequire = true;
				}
				dep = this.newRequireItemDependency(param.string, parser.state.current, props, param.range);
			}
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
		} else {
			const req = (this.verb === "define") ? 	`${djProp}.c(module.i)` : expr.callee.name;
			var dep = new ConstDependency(`${req}(`, [param.range[0], param.range[0]]);
			dep.loc = {start:expr.loc.start, end:expr.loc.start};
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
			dep = new ConstDependency(",null,false)", [param.range[1], param.range[1]]);
			dep.loc = {start:expr.loc.end, end:expr.loc.end};
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
		}
		return true;
	}
	expressionRequire() {
		return true;
	}

	processCallRequire(parser, expr) {
		if (!parser.state.module.isAMD || expr.callee.name === "cjsRequire") {
			return;
		}
		switch(expr.arguments.length) {
			case 1:
				if (expr.arguments[0].type === "Literal") {
					const patterns = this.options.cjsRequirePatterns || [/(exports-loader|imports-loader)[?!]/];
					if (patterns.some((pattern) => {
						return pattern.test(expr.arguments[0].value);
					})) {
						return;
					}
				}
				// Fall thru
			case 2:
				if (expr.arguments[0].type === "ArrayExpression" || parser.evaluateExpression(expr.arguments[0]).isConstArray()) {
					return super.processCallRequire && super.processCallRequire(parser, expr);
				}
				return true; // let client handle
		}
	}

	newDefineDependency(...args) {
		return new DojoAMDDefineDependency(...args);
	}
	newRequireArrayDependency(deps, range, props) {
		return new DojoAMDRequireArrayDependency(deps, range, props);
	}
	newRequireItemDependency(expr, module, props, range) {
		return new DojoAMDRequireItemDependency(expr, module, props, range);
	}
};
