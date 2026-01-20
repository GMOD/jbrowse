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
/* globals module loaderScope */

/*
 * This module patches the Dojo loader to correct the behavior of toAbsMid
 * with regards to package main modules.  The issue is that if the main module
 * is specified as an absolute path or a relative path that resolves outside
 * the package directory (e.g. ../../something), then toAbsMid returns an
 * irrational path.  To work around this issue, we do the following:
 *
 * 1. Replace the main path used by Dojo with an empty string, saving the real
 *    main path in the 'realMain' property.  The causes Dojo's toAbsMid to return
 *    an absMid like 'packageName/'.
 *
 * 2. In our patched implementation of toAbsMid, we remove the traling slash
 *    before returning the result to the user so that the absMid for a package
 *    is just the package name.
 *
 * 3. In our patched implementation of toUrl, we call the Dojo implementation
 *    and fixup the url using the path saved in the 'realMain' property.
 */
module.exports = function() {
	Object.keys(loaderScope.require.packs).forEach(function(key) {
		var pkg = loaderScope.require.packs[key];
		if ((/(^\/)|(\:)/.test(pkg.main)	// main path is absolute
		    || pkg.main.split('/').reduce(function(acc, pathComp) {
					if (acc < 0 || pathComp === '.') return acc;
					return (pathComp === '..' ? --acc : ++acc);
				}, 0) <= 0) // main path is outside package
				&& typeof pkg.realMain === 'undefined'	// hasn't already been adjusted
		) {
			pkg.realMain = pkg.main;
			pkg.main = '';
		}
	});
	function toAbsMid(name, referenceModule) {
		var absMid = loaderScope.require.originalToAbsMid(name, referenceModule);
		if (absMid.indexOf('/') === absMid.length-1) {
			var pkgName = absMid.substring(0, absMid.length-1);
			var pkg = loaderScope.require.packs[pkgName];
			if (pkg && pkg.realMain) {
				absMid = pkgName;
			}
		}
		return absMid;
	}
	function toUrl(name, referenceModule) {
		var url = loaderScope.require.originalToUrl(name, referenceModule);
		var pkg = loaderScope.require.packs[name];
		if (pkg && pkg.realMain) {
			var parts = url.split('?');
			if (/(^\/)|(\:)/.test(pkg.realMain)) {
				// absolute URL
				parts[0] = pkg.realMain;
			} else {
				// relative URL
				parts[0] = parts[0] + '/' + pkg.realMain;
			}
			url = parts.join('?');
		}
		return url;
	}
	loaderScope.require.originalToAbsMid = loaderScope.require.toAbsMid;
	loaderScope.require.originalToUrl = loaderScope.require.toUrl;
	loaderScope.require.toAbsMid = toAbsMid;
	loaderScope.require.toUrl = toUrl;
};