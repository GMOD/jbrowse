define([], function() {
	require('test/foo'.split(","), function() {
		throw new Error("Shouldn't get here");
	});
});
