module.exports = {
	test: function(error) {
		return /Dojo loader version does not match the version of Dojo/.test(error.message);
	}
};