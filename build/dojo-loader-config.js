module.exports = function(env) {

    dojoConfig = {
		baseUrl: '.',
		packages: [
			{
				name: 'dojo',
				location: env.dojoRoot + '/dojo',
				lib: '.'
			},
			{
				name: 'dijit',
				location: env.dojoRoot + '/dijit',
				lib: '.'
			},
			{
				name: 'dojox',
				location: env.dojoRoot + '/dojox',
				lib: '.'
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
                name: 'jDataView',
                location: env.dojoRoot + '/jDataView/src',
                lib: '.',
                main: 'jdataview'
            },
            {
                name: 'FileSaver',
                location: env.dojoRoot + '/filesaver.js',
                lib: '.'
            }
		],

		async: true
	};
	return dojoConfig;
};
