if(!dojo._hasResource["dojox.dtl.tests.html.buffer"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.tests.html.buffer"] = true;
dojo.provide("dojox.dtl.tests.html.buffer");

dojo.require("dojox.dtl.html");
dojo.require("dojox.dtl.Context");
dojo.require("dojox.dtl.tests.html.util");

doh.register("dojox.dtl.html.buffer", 
	[
		function test_insertion_order_text(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				first: false,
				last: false
			});

			var template = new dd.HtmlTemplate("<div>{% if first %}first{% endif %}middle{% if last %}last{% endif %}</div>");
			t.is("<div>middle</div>", dd.tests.html.util.render(template, context));

			context.first = true;
			t.is("<div>firstmiddle</div>", dd.tests.html.util.render(template, context));

			context.first = false;
			context.last = true;
			t.is("<div>middlelast</div>", dd.tests.html.util.render(template, context));

			context.first = true;
			t.is("<div>firstmiddlelast</div>", dd.tests.html.util.render(template, context));
		}
	]
);

}
