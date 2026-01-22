const should = require("should").default;
define([
	"require",
	"dojo/_base/config",
	"dojo/has",
	"dojo/i18n!./nls/strings1",
	"dojo/i18n!./nls/strings2",
	"dojo/i18n!./nls/fr/strings1",
	"dojo/i18n!./nls/de/strings1",
	"./nls/strings1"
], function(
	require,
	config,
	has,
	strings1,
	strings2,
	frStrings1,
	deStrings1,
	rawStrings1
) {
	const lang = config.locale ? config.locale : "default";
	it(`should load strings for ${lang} language`, function() {
		var hello = "Hello", goodby = "Good by";
		if (!has("empty-locales")) {
			switch (lang) {
				case "fr": hello = "Bonjoure"; goodby = "Bon par"; break;
				case "de": goodby = "Auf Wiedersehen"; break;
				case 'es':	hello = "Hola"; break;
				case 'es-us':	hello = "Hola (US)"; break;
				case 'en-au': hello = "G'day";
				case 'it': hello = "Ciao"; goodby = "Bene da"; break;
				case 'it-ch': hello = "Ciao (ch)"; goodby = "Bene da"; break;
			}
		}
		strings1.hello.should.be.eql(hello);
		strings2.goodby.should.be.eql(goodby);
	});
	if (!has("empty-locales")) {
		it("should load locale specific strings", function() {
			// load a locale specific bundle
			require("./nls/fr/strings1").hello.should.be.eql("Bonjoure");
		});
	} else {
		it("should fail to load locale specific strings", function() {
			try {
				require("./nls/fr/strings1");
				should.fail("Callback should not be called");
			} catch (e) {}
		});
		it("should disable all locales in raw bundle", function() {
			Object.keys(rawStrings1).forEach(function(key) {
				if (key === "root") return;
				("" + key + ":" + rawStrings1[key]).should.be.eql("" + key + (key === "not-a-locale" ? ":0" : ":false"));
			});
		});
	}
	it("should load language specific nls bundle", function() {
		frStrings1.hello.should.be.eql(has("empty-locales") ? "Hello" : "Bonjoure");
		deStrings1.hello.should.be.eql("Hello");	// always english because de is disabled in root bundle
	});
	it("should not modify rawStrings1 not-a-locale property value", function() {
		rawStrings1['not-a-locale'].should.be.eql(0);
	});
});
