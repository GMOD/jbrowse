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
const majorVersion = parseInt(require("webpack/package.json").version.split(".")[0]);

module.exports = {
	versionSuffix:  majorVersion >= 4 ? "V4" : "V3",
	getIndent(template) {
		return template.indent||require("webpack/lib/Template").indent;
	},
	getAsString(template) {
		return template.asString||require("webpack/lib/Template").asString;
	},
	modulesFromChunk(chunk) {
		return chunk.getModules ? chunk.getModules() : chunk.modules;
	},
	getRequireExtensionsHookName(template) {
		return template.hooks ? "beforeStartup" : "require-extensions";
	},
	needChunkLoadingCode(chunk) {
		if (chunk.groupsIterable) {
			for (const chunkGroup of chunk.groupsIterable) {
				if (chunkGroup.chunks.length > 1) return true;
				if (chunkGroup.getNumberOfChildren() > 0) return true;
			}
			return false;
		} else {
			return chunk.chunks.length > 0;
		}
	},
	containsModule(chunk, module) {
		return (chunk.containsModule) ? chunk.containsModule(module) : chunk.modules.indexOf(module) !== -1;
	},
	getRenameFor(parser, name) {
		if (parser.scope.renames.asMap) {
			return parser.scope.renames.asMap().get(name);
		} else {
			return parser.scope.renames["$"+name];
		}
	},
	applyResolverPlugin(options, compiler, resolverFactory) {
		if (majorVersion >= 4) {
			resolverFactory(options, compiler).apply(compiler);
		} else {
			compiler.options.resolve.plugins = compiler.options.resolve.plugins || [];
			compiler.options.resolve.plugins.push(resolverFactory(options, compiler));
		}
	},
	getModuleTemplate(compilation) {
		return  compilation.moduleTemplates ? compilation.moduleTemplates.javascript : compilation.moduleTemplate;
	},
	preWebpackV4(string) {
		return majorVersion < 4 ? string : '';
	}
};