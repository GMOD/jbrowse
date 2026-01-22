module.exports = function(env) {
	return {
		paths: {foo: env.foopath},
		aliases: [[/^fooalias$/, function() {return env.foopath;}]],
		noConfigApi: !!env.noConfigApi,
		has:{'dojo-config-api': !env.noConfigApi}
	};
};
