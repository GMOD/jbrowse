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
const path = require("path");
const ModuleDependency = require("webpack/lib/dependencies/ModuleDependency");

class DojoAMDRequireItemDependency extends ModuleDependency {
	constructor(request, issuer, props, range) {
		const deps = [];
		const issuerModule = issuer.module || issuer;
		var originalRequest, featureDeps;
		const resolved = resolveTernaryHasExpression(request, deps, props);
		originalRequest = request;
		if (!resolved) {
			// feature expression evaluation resulted in no module
			request = path.join(__dirname, "./NoModule.js");
		} else if (deps.length === 0) {
			// feature expression evaluation resulted in a single module, or there is no feature expression
			request = resolved;
		} else {
			// There are undefined feature names in the expression, so we need to evaluate the expression
			// on the client at run-time.  Add dependencies for each of the modules involved in the
			// expression and save the simplified expression and the dependencies as properties on
			// this object.  The expression will be post-processed by the template using the module ids
			// of the dependencies after they have been resolved.
			request = path.join(__dirname, "./NoModule.js");
			featureDeps = [];
		}
		super(request);
		if (featureDeps) {
			deps.forEach((dep) => {
				const featureDep = this.newRequireItemDependency(dep, issuerModule, props);
				issuer.addDependency(featureDep);
				featureDeps.push(featureDep);
			});
			issuerModule.addDependency(this.newRequireItemDependency("dojo/has", issuerModule, props));
			this.featureExpression = resolved;
			this.featureDeps = featureDeps;
		}
		if (props.usingGlobalRequire) {
			this.usingGlobalRequire = true;
		}
		this.djProp = props.djProp;
		this.originalRequest = originalRequest;
		this.issuerModule = issuerModule;
		this.range = range;
	}
}
module.exports = DojoAMDRequireItemDependency;

DojoAMDRequireItemDependency.prototype.type = "amd require";

DojoAMDRequireItemDependency.Template = require("./DojoAMDModuleDependencyTemplateAsRequireId");


/*
 * This function partially or fully resolves a dojo/has.js feature expression based on the currently
 * defined features.  If the request does not specify a feature expression, then the request is returned
 * unchanged.  Otherwise, if all of the features are defined, then a module name is returned or an empty
 * string is returned, depending on the result of the evaluation.  If any of the features is not
 * defined (i.e. evaluating a feature name returns undefined), then this function will return
 * a simplified expression that contains only the undefined features, and with the module names
 * replaced with %%# tokens, where # is an index into the deps array for the dependency object
 * corresponding to the associated module.  The %%# tokens get replaced with the webpack module ids
 * for the resolved dependencies during application of this dependency object's template.
 *
 * request - The request.  May contain dojo/has conditional expression
 * deps - On input, an empty array.  On output, contains the unresolved expression module dependencies
 * props - and object with options and require properties
 */
function resolveTernaryHasExpression(request, deps, props) {
	deps.length = 0;
	var isUnresolvedFeatures = false;
	const match = /^[^!]*\/?has!(.+)$/.exec(request);
	if (!match) {
		return request;
	}
	// Adapted from code in dojo/has.js
	const tokens = match[1].match(/[\?:]|[^:\?]*/g);
	var i = 0;
	function get(result, skip){
		const term = tokens[i++];
		if(term == ":"){
			// empty string module name, resolves to empty string
			return result;
		}else{
			// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
			if(tokens[i++] == "?"){
				let value;
				if (!(props.options.runtimeFeatures||[]).includes(term)) {
					value = props.require.has(term);
				};
				if (typeof value !== 'undefined' || props.options.coerceUndefinedToFalse) {
					if(!skip && value){
						// matched the feature, get the first value from the options
						result += get(result);
						get("", true);
						return result;
					}else{
						// did not match, get the second value, passing over the first
						get("", true);
						return result + get(result, skip);
					}
				} else {
					isUnresolvedFeatures = true;
					const trueResult = get(result,skip);
					const falseResult = get(result,skip);
					if (trueResult || falseResult) {
						result = result + term + "?" + trueResult + (falseResult ? (":" + falseResult) : "");
					}
				}
			} else if (term && !skip) {
				// a module
				deps.push(term);
				result += ("%%" + (deps.length-1));
			}
			return result;
		}
	};
	var result =  get("");
	if (!isUnresolvedFeatures) {
		result = deps[0] || "";
		deps.length = 0;
	}
	return result;
}

// For unit testing
DojoAMDRequireItemDependency.resolveTernaryHasExpression = resolveTernaryHasExpression;

