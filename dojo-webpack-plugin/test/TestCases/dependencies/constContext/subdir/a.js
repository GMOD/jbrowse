define([], function() {
	return {
		loadc: function(callback) {
			require("c".split(','), function(c) {
				callback(c);
			});
		}
	};
});