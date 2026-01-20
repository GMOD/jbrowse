module.exports = {
	test: function(error) {
		return /ENOENT:/.test(error.message);
	}
};