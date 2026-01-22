/*
* (C) Copyright HCL Technologies Ltd. 2019
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
const fork = require("child_process").fork;

/*
 * parameters:
 *	dojoPath   - The path to dojo.js source file
 *  releaseDir - The path to the directory where the built loader will be written
 *               The build loader will be in <releaseDir>/dojo/dojo.js
 *  featureOverrides - Overrides to ./loaderDefaultFeatures.js
 *  noConsole  - True to suppress stdout from the builder
 */
function buildLoader(params) {
	const ls = fork(
		path.resolve(__dirname, "buildRunner.js"),
		[
			"load=build",
			"--dojoPath",
			path.resolve(params.dojoPath),
			"--profile",
			path.join(__dirname, "loader.profile.js"),
			"--release",
			"--releaseDir",
			path.resolve(params.releaseDir),
			"--has",
			JSON.stringify(params.has || {})
		],
		{
			silent: true
		}
	);
	return new Promise(function(resolve, reject) {
		const errors = [];
		ls.stdout.on('data', data => {
			if (!params.noConsole) {
				console.log(`${data}`);
			}
		});
		ls.stderr.on('data', data => {
			const decoded = `${data}`;
			errors.push(decoded);
			console.error(decoded);
		});
		ls.on('close', code => {
			if (code == 0) {
				resolve();
			} else {
				const err = new Error(errors.join(""));
				err.code = code;
				reject(err);
			}
		});
	});
}
module.exports = buildLoader;