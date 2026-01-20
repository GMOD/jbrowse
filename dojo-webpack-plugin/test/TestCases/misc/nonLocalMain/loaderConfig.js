module.exports = function(env) {
	return {
		paths:{test: "."},
		packages:[
			{name:"foo", location:"./sub/foo", main:"../../sub/bar/main"},
			{name:"bar", location:"./sub/bar"}
		],
		has: {'host-browser':0, 'dojo-config-api':env.hasConfigApi}
	};
};