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
var profilePath, dojoPath;
process.argv.forEach((arg, i) => {
	if (arg === '--profile') {
		profilePath = process.argv[i+1];
	} else if (arg === '--dojoPath') {
		dojoPath = process.argv[i+1];
	}
});
if (!profilePath) {
	throw new Error("--profile command line option not specified");
}
if (!dojoPath) {
	throw new Error("--dojoPath command line option not specified");
}
global.dojoConfig = require(profilePath);
require(path.resolve(dojoPath));
