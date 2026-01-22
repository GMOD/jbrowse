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
 * Dojo build profile for building the loader
 */
const nodeRequire = require.rawConfig && require.rawConfig.loaderPatch.nodeRequire || require;
const path = nodeRequire("path");
const fs = nodeRequire("fs");

var profilePath, dojoPath, featureOverrides = {};
process.argv.forEach((arg, i) => {
	if (arg === '--profile') {
		profilePath = process.argv[i+1];
	} else if (arg === '--dojoPath') {
		dojoPath = process.argv[i+1];
	} else if (arg === '--has') {
		featureOverrides = JSON.parse(process.argv[i+1]);
	}
});
if (!profilePath) {
	throw new Error("--profile command line option not specified");
}
if (!dojoPath) {
	throw new Error("--dojoPath command line option not specified");
}

function getLoaderDefaultFeatures() {
	const loaderPath = path.resolve(dojoPath, "../", "./package.json");
	const pkg = nodeRequire(loaderPath);
	if (pkg.name !== "dojo") {
		throw new Error(`Expected package.json for 'dojo' at '${loaderPath}' but found '${pkg.name}' instead.`);
	}
	const version = pkg.version;
	const versionParts = version.split(".");
	const majorVersion = parseInt(versionParts[0]), minorVersion = parseInt(versionParts[1]), patchVersion = parseInt(versionParts[2]);
	if (majorVersion !== 1) {
		throw new Error("Unsupported Dojo Version");
	}
	const hasInjectApiFix =	/* True if the version of Dojo has https://github.com/dojo/dojo/pull/266 */
		minorVersion > 12 ||
		minorVersion === 12 && patchVersion >= 3 ||
		minorVersion === 11 && patchVersion >= 5 ||
		minorVersion === 10 && patchVersion >= 9;

	var features = nodeRequire(path.join(process.argv[1], "../loaderDefaultFeatures"));
	features = Object.assign({}, features, featureOverrides);
	features['dojo-inject-api'] = !hasInjectApiFix;
	return features;
}

var profile = (() => {
	const profileDir = path.resolve(profilePath);
	const dojoDir = path.resolve(dojoPath, "..");
	var util = "../dojo-util";
	if (!fs.existsSync(path.resolve(dojoDir, util))) {
		util = "../util";
	}

  return {
			layerOptimize: false,
			releaseDir: "./release",

        packages:[{
            name:"dojo",
            location:dojoDir,
            trees: [[".", ".", /\.*/]]
				}, {
					name:"util",
					location: path.resolve(dojoDir, util),
					trees: [[".", ".", /\.*/]]
        }, {
					name:"build",
					location: path.resolve(dojoDir, util, "build"),
					trees: [[".", ".", /\.*/]]
				}],

        staticHasFeatures: getLoaderDefaultFeatures(),

        layers: {
            "dojo/dojo": {
                include: [],
                customBase: 1
            }
        },
        transforms: {
            writeDojo: [path.join(profileDir, "..", "./transforms/writeDojo.js"), "write"]
        }
    };
})();
if (typeof module !== 'undefined' && !!module) {
	module.exports = profile;
}
