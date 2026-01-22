define(["test/asyncPlugin!foobar"], function() {
	return {then: function() {
		throw new Error("then function should not be called");
	}};
});