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
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * ATTENTION!!! If you make changes to this file that affect the generated code,
 * be sure to update the hash generation function at the end of the file.
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */

const {reg, tap, callSyncWaterfall} = require("webpack-plugin-compat").for("dojo-webpack-plugin");
const {getIndent, getAsString, modulesFromChunk} = require("./compat");
const {ConcatSource} = require('webpack-sources');

module.exports = class DojoAMDChunkTemplatePlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		this.compiler = compiler;
		tap(compiler, "compilation", (compilation, params) => {
			const context = Object.create(this, {
				compilation:{value: compilation},
				params:{value:params},
				indent:{value:getIndent(compilation.chunkTemplate)},
				asString:{value:getAsString(compilation.chunkTemplate)}
			});
			reg(compilation.chunkTemplate, "renderAbsMids", ["SyncWaterfall", "source", "chunk"]);
			tap(compilation.chunkTemplate, {
				"render"         : this.render,
				"render absMids" : this.renderAbsMids,
				"hash"           : this.hash
			}, context);
		});
	}

	render(source, chunk) {
		const chunkTemplate = this.compilation.chunkTemplate;
		const jsonpFn = JSON.stringify(chunkTemplate.outputOptions.jsonpFunction);

		const buf = [];
		buf.push("(function(){");
		buf.push(`(this||window)[${jsonpFn}].registerAbsMids({`);
		buf.push(callSyncWaterfall(chunkTemplate, "render absMids", "", chunk));
		buf.push("})");
		buf.push("})(),");
		return new ConcatSource(this.asString(buf), source);
	}

	renderAbsMids(source, chunk) {
		var modules = modulesFromChunk(chunk);
		const buf = [], renderedAbsMids = {};
		var lastEntry;
		const renderAbsMid = function(absMid, mod) {
			if (!renderedAbsMids.hasOwnProperty(absMid)) {
				if (lastEntry >= 0) {
					buf[lastEntry] += ",";
				}
				buf.push(this.indent(`${JSON.stringify(absMid)}:${JSON.stringify(mod.id)}`));
				lastEntry = buf.length-1;
				renderedAbsMids[absMid] = mod;
			} else if (renderedAbsMids[absMid] !== mod) {
				throw new Error(`Duplicate absMid (${JSON.stringify(absMid)}) for modules ${JSON.stringify(renderedAbsMids[absMid].request)} and ${JSON.stringify(mod.request)}`);
			}
		}.bind(this);
		modules.forEach((module) => {
			var rendered = false;
			module.filterAbsMids && module.filterAbsMids(absMid => {
				renderAbsMid(absMid, module);
				return rendered = true;
			});
			if (!rendered) {
				buf.push(this.indent(`// ${JSON.stringify(module.rawRequest)} = ${JSON.stringify(module.id)}`));
			}
		});
		return source + this.asString(buf);
	}

	hash(hash) {
		hash.update("DojoAMDChunkTemplate");
		hash.update("3");		// Increment this whenever the template code above changes
	}
};
