define([], function() {
	return {
		load: function(name, req, callback) {
			req(["dojo/text!" + name], function(text) {
				callback("Header\n"+text);
			});
		}
	};
});