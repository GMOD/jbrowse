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
 /* globals module loaderScope __webpack_require__ __async__ installedModules Promise */

module.exports = {
	main: function() {
		function mix(dest, src) { // eslint-disable-line no-unused-vars
			for(var n in src) dest[n] = src[n];
			return dest;
		}

		function toUrl(name, referenceModule) {
			return loaderScope.require.toUrl(name, referenceModule);
		}

		function toAbsMid(name, referenceModule) {
			return loaderScope.require.toAbsMid(name, referenceModule);
		}

		// dojo require function.
		function req(config, dependencies, callback) {
			return contextRequire(config, dependencies, callback, 0, req);
		};

		function createContextRequire(moduleId) { // eslint-disable-line no-unused-vars
			if (req.absMidsById[moduleId]) {
				moduleId = req.absMidsById[moduleId];
			}
			if (!moduleId) return req;
			var result = function(a1, a2, a3) {
				return contextRequire(a1, a2, a3, moduleId, req);
			};
			for (var p in req) {
				if (req.hasOwnProperty(p)) {
					result[p] = req[p];
				}
			}
			result.toUrl = function(name) {
				return toUrl(name, moduleId ? {mid: moduleId} : null);
			};
			result.toAbsMid = function(name) {
				return toAbsMid(name, moduleId ? {mid: moduleId} : null);
			};

			if (req.undef) {
				result.undef = function(mid) {
					req.undef(mid, moduleId);
				};
			}
			return result;
		}

		function registerAbsMids(absMids) { // eslint-disable-line no-unused-vars
			for (var s in absMids) {
				req.absMids[s] = absMids[s];
				if (!req.absMidsById[absMids[s]]) {
					req.absMidsById[absMids[s]] = s;
				}
			}
		}

		function resolveTernaryHasExpression(expr) { // eslint-disable-line no-unused-vars
			// Expects an expression of the form supported by dojo/has.js loader, except that module identifiers are
			// integers corresponding to webpack module ids.  Returns a module reference if evaluation of the expression
			// using the currently defined features returns a module id, or else undefined.

			var has = findModule("dojo/has", null, false);
			var id = has.normalize(expr, function(arg){return arg;});
			return id && __webpack_require__(id) || undefined;
		}

		function findModule(mid, referenceModule, noInstall, asModuleObj) {
			mid = mid.split("!").map(function(segment) {
				var isRelative = segment.charAt(0) === '.';
				if(isRelative && !referenceModule){
					return segment;
				}
				return toAbsMid(segment, referenceModule ? {mid: referenceModule} : null);
			}).join("!");
			var result;
			if (mid in req.absMids && __webpack_require__.m[req.absMids[mid]]) {
				if (noInstall) {
					var module = installedModules[req.absMids[mid]];
					result = module && module.l && (asModuleObj ? module : module.exports);
				} else {
					result = __webpack_require__(req.absMids[mid]);
				}
			}
			if (!result) {
				throw new Error('Module not found: ' + mid);
			}
			return result;
		}

		function dojoModuleFromWebpackModule(webpackModule) { // eslint-disable-line no-unused-vars
			var result = {i:webpackModule.i};
			var id = req.absMidsById[webpackModule.i];
			if (id) {
				result.id = id;
			}
			Object.defineProperty(result, "exports", {
				get: function() { return webpackModule.exports;},
				set: function(value) {webpackModule.exports = value;},
				enumerable: true,
				configurable: true
			});
			return result;
		}

		function contextRequire(a1, a2, a3, referenceModule, req) { // eslint-disable-line no-shadow
			var type = ({}.toString).call(a1);
			if (type === '[object String]') {
				// a3 is passed by require calls injected into dependency arrays for dependencies specified
				// as identifiers (vs. string literals).
				var noInstall = !(a3 === false);
				var m = findModule(a1, referenceModule, noInstall);
				if (typeof m === 'object' && m.__DOJO_WEBPACK_DEFINE_PROMISE__) {
					throw new Error('Module not found: ' + a1);
				}
				return m;
			} else if (type === '[object Object]') {
				throw new Error('Require config is not supported by WebPack');
			}
			if (type === '[object Array]') {
				var modules = [], callback = a2, errors = [];
				a1.forEach(function (mid) {
					try {
						modules.push(findModule(mid, referenceModule));
					} catch (e) {
						errors.push({mid: mid, error: e});
					}
				});
				if (errors.length === 0) {
					if (callback) {
						if (__async__ && isDefinePromise(modules)) { // eslint-disable-line no-undef
							Promise.all(wrapPromises(modules)).then(function(deps) { // eslint-disable-line no-undef
								callback.apply(this, unwrapPromises(deps)); // eslint-disable-line no-undef
							}.bind(this)).catch(function(err){console.error(err);});
						} else {
							callback.apply(this, modules);
						}
					}
				} else {
					var error = new Error("findModules");
					error.src = "dojo-webpack-plugin";
					error.info = errors;
					req.signal("error", error);
				}
				return req;
			} else {
				throw new Error('Unsupported require call');
			}
		}
		req.toUrl = toUrl;
		req.toAbsMid = toAbsMid;
		req.absMids = {};
		req.absMidsById = [];
		req.async = 1;
	},

	async: function() {
		function wrapPromises(deps) {
			var result = (Array.isArray(deps) ? deps : [deps]).map(function(m) {
				return (m && typeof m.then === 'function' && !m.__DOJO_WEBPACK_DEFINE_PROMISE__) ? {__DOJO_WEBPACK_PROMISE_VALUE__: m} : m;
			});
			return Array.isArray(deps) ? result : result[0];
		}

		function unwrapPromises(deps) {
			var result = (Array.isArray(deps) ? deps : [deps]).map(function(m) {
				return m && m.__DOJO_WEBPACK_PROMISE_VALUE__ || m;
			});
			return Array.isArray(deps) ? result : result[0];
		}

		function isDefinePromise(values) {
			return (Array.isArray(values) ? values : [values]).some(function(dep) {
				return typeof dep === 'object' && dep.__DOJO_WEBPACK_DEFINE_PROMISE__;
			});
		}

		function asyncDefineModule(defArray, defFactory, module, exports) { // eslint-disable-line no-unused-vars

			function setDefinePromise(promise) {
				promise.__DOJO_WEBPACK_DEFINE_PROMISE__ = true;
				return promise;
			}

			function defModule(deps) {
				module && (module.exports = exports);
				var result =  defFactory.apply(null, deps);
				if (typeof module === 'function') {
					// module is actually a callback function
					module(result);
				} else {
					if (result !== undefined) {
						module.exports = result;
					} else {
						result = module.exports;
					}
				}
				return result;
			}

			if (!isDefinePromise(defArray)) {
				return defModule(defArray);
			} else {
				return setDefinePromise(Promise.all(defArray).then(function(deps) {
					return wrapPromises(defModule(unwrapPromises(deps)));
				}));
			}
		}
	},

	makeDeprecatedReq: function() {
		(function() {
			function warnDeprecated() {
				console.warn('req is deprecated and will be removed in a future release.');
			}
			var req = __webpack_require__.dj.r;
			function depReq() {
				warnDeprecated();
				return req.apply(this, arguments);
			};
			Object.keys(req).forEach(function(name) {
				Object.defineProperty(depReq, name, {
					get: function() {
						warnDeprecated();
						return req[name];
					},
					enumerable: true,
					configurable: false
				});
			});
			return depReq;
		})();
	},

	undef: function() {
		function undef(mid, referenceModule) { // eslint-disable-line no-unused-vars
			var module = findModule(mid, referenceModule, true, true); // eslint-disable-line no-undef
			if (module) {
				delete installedModules[module.i];
			}
		}
	}
};
