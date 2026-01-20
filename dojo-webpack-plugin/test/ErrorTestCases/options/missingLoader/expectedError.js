module.exports = {
	test: function(error) {
		return /Cannot find module \'.*[\/\\]dojo.js'$/.test(error);
	}
};