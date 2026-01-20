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
 * This transform is an adaptation of the write transform in dojo/util that has been modified to build
 * the dojo loader only, without copying any other sources to the output directory and to avoid minifying
 * the output file.
 *
 * See https://github.com/dojo/util/blob/1.10/build/transforms/writeDojo.js
 */
define([
	"util/build/buildControl",
	"util/build/fileUtils",
	"util/build/fs",
	"util/build/transforms/writeAmd",
	"dojo/text!dojo/package.json"

], function(bc, fileUtils, fs, writeAmd, pkg){
	return function(resource, callback){
		var
			waitCount = 1, // matches *1*

			errors = [],

			onWriteComplete = function(err){
				if(err){
					errors.push(err);
				}
				if(--waitCount==0){
					callback(resource, errors.length && errors);
				}
			},

			doWrite = function(filename, text){
				fileUtils.ensureDirectoryByFilename(filename);
				waitCount++;
				fs.writeFile(filename, bc.newlineFilter(text, resource, "writeDojo"), "utf8", onWriteComplete);
			};

		// the writeDojo transform...
		try{
			const version = JSON.stringify(JSON.parse(pkg).version);
			// assemble and write the dojo layer
			resource.uncompressedText = "module.exports = function(userConfig, defaultConfig, global, window) { this.loaderVersion = " + version + "; " + resource.getText() + ".call(this, userConfig, defaultConfig);};";
			doWrite(writeAmd.getDestFilename(resource), resource.uncompressedText);

			onWriteComplete(0); // matches *1*
		}catch(e){
			if(waitCount){
				// can't return the error since there are async processes already going
				errors.push(e);
				return 0;
			}else{
				return e;
			}
		}
		return callback;
	};
});
