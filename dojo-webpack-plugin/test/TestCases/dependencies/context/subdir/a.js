define([], function() {
	return {
		loadc: function(callback) {
			require(["c"], function(c) {
				callback(c);
			});
		}
	};
});