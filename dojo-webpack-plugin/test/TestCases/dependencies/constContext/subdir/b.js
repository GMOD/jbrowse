define(["require", "./a"], function(req, siblingA) { //eslint-disable-line
	return {
		loadc: function(callback) {
			req("./c".split(','), function(c) {
				callback(c);
			});
		}
	};
});