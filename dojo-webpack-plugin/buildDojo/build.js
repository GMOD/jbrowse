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
const fork = require("child_process").fork;

const dojoPath = global.process.argv.length > 2 && global.process.argv[2];
const releaseDir = global.process.argv.length > 3 && global.process.argv[3];
const featureOverrides = global.process.argv.length > 4 && global.process.argv[4]  || "{}";
if (!dojoPath) {
	throw Error("Path to dojo not specified");
}
if (!releaseDir) {
	throw Error("Target path not specified");
}
const ls = fork(
	path.resolve(__dirname, "buildRunner.js"),
	[
		"load=build",
		"--dojoPath",
		path.resolve(dojoPath),
		"--profile",
		path.join(__dirname, "loader.profile.js"),
		"--release",
		"--releaseDir",
		path.resolve(releaseDir),
		"--has",
		featureOverrides
	]
);

ls.on('close', (code) => {
  console.log('child process exited with code ' + code);
});
