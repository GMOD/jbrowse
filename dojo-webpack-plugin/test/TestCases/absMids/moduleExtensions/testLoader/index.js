const loaderUtils = require("loader-utils");

module.exports = function(content) {
	this.value = content;
	const query = this.query ? loaderUtils.parseQuery(this.query) : {};
	if (query.addAbsMids) {
		query.addAbsMids.split("|").forEach(absMid => {
			this._module.addAbsMid(absMid);
		});
	}
	if (query.filterAbsMids) {
		query.filterAbsMids.split("|").forEach(regex => {
			this._module.filterAbsMids(absMid => {
				return !(new RegExp(regex)).test(absMid);
			});
		});
	}
	return "module.exports = \"" + content.replace(/[\r\n]/g,"") + "\"";
};
