const path = require('path')
const glob = require('glob')

module.exports = function(env) {

    dojoConfig = {
		baseUrl: '.',
		packages: [
			{
				name: 'dojo',
				location: env.dojoRoot + '/dojo',
			},
			{
				name: 'dijit',
				location: env.dojoRoot + '/dijit',
			},
			{
				name: 'dojox',
				location: env.dojoRoot + '/dojox',
			},
            {
                name: 'JBrowse',
                location: 'src/JBrowse',
                lib: '.'
            },
            {
                name: 'dgrid',
                location: env.dojoRoot + '/dgrid',
                lib: '.'
            },
            {
                name: 'dstore',
                location: env.dojoRoot + '/dojo-dstore',
                lib: '.'
            },
            {
                name: 'json-schema',
                location: env.dojoRoot + '/json-schema',
                lib: '.'
            },
            {
                name: 'jszlib',
                location: env.dojoRoot + '/jszlib',
                lib: '.'
            },
            {
                name: 'lazyload',
                location: env.dojoRoot + '/lazyload',
                lib: 'lazyload',
                main: 'lazyload'
            },
            {
                name: 'FileSaver',
                location: env.dojoRoot + '/filesaver.js',
                lib: '.'
            }
        ]
        .concat(
            glob.sync('plugins/*/')
            .map( plugindir => ({
                name: path.basename(plugindir),
                location: plugindir+'js'
            }))
        )
        ,

		async: true
    };
	return dojoConfig;
};
