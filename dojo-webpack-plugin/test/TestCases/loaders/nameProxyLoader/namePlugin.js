define([], function() {
	return {
		load: function(name, req, callback) {
			req(["dojo/text!test/content.txt"], function(text) {
				callback(text.replace("{name}", name));
			});
		}
	};
});
