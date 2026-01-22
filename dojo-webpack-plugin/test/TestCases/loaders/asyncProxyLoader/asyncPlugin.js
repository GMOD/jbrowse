define([], function() {
	return {
		load: function(name, req__, callback) {
			setTimeout(function() {
				callback("Name = " + name);
			}, 100);
		}
	};
});