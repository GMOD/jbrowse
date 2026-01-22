define(["test/foo?absMid=foobar", "test/bar?absMid=foobar"], function() {
	throw new Error("Shouldn't get here!");
});
