define([], function() {
	return {
		load: function(name__, req, callback) {
			req(["test/foo"], function(foo) {
				callback(foo);
			});
		}
	};
});
