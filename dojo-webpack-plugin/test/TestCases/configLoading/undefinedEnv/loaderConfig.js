module.exports = function() {
	return {
		paths: {foo: "/test/foo"},
		aliases: [[/^fooalias(\/.*)?$/, function(__, $1) {return "/test/foo" + $1;}]]
	};
};
