module.exports = {
	test: function(error) {
		return /Expected package.json for 'dojo' at '(.*?)' but found 'foo' instead/.test(error.message);
	}
};