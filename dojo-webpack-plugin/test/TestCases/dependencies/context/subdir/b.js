define(["require", "./a"], function(req, siblingA) { //eslint-disable-line
	return {
		loadc: function(callback) {
			req(["./c"], function(c) {
				callback(c);
			});
		}
	};
});