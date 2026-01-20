define([], function() {
	require('dojo/has!foo?:test/foo'.split(","), function() {
		throw new Error("Shouldn't get here");
	});
});
