define([], function() {
	return {
		load: function(name, req, callback) {
			req(["text!" + name], function(text) {
				callback("Header\n"+text);
			});
		}
	};
});