if(!dojo._hasResource["dojox.dtl.tests.html.tag"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.dtl.tests.html.tag"] = true;
dojo.provide("dojox.dtl.tests.html.tag");

dojo.require("dojox.dtl.html");
dojo.require("dojox.dtl.Context");
dojo.require("dojox.dtl.tests.html.util");

doh.register("dojox.dtl.html.tag", 
	[
		function test_errors(t){
			var dd = dojox.dtl;
			var template;

			// No root node after rendering
			var found = false;
			try {
				template = new dd.HtmlTemplate('No div');
				dd.tests.html.util.render(template);
			}catch(e){
				t.is("Text should not exist outside of the root node in template", e.message);
				found = true;
			}
			t.t(found);

			var context = new dojox.dtl.Context({test: "Pocket"});
			found = false;
			try {
				template = new dd.HtmlTemplate('{{ test }}');
				dd.tests.html.util.render(template, context);
			}catch(e){
				t.is("Text should not exist outside of the root node in template", e.message);
				found = true;
			}
			t.t(found);

			template = new dd.HtmlTemplate('<div></div>extra content');
			found = false;
			try {
				dd.tests.html.util.render(template);
			}catch(e){
				t.is("Content should not exist outside of the root node in template", e.message);
				found = true;
			}
			t.t(found);

			// More than one top-level node (except for blocks)
			template = new dd.HtmlTemplate('<div></div><div></div>');
			found = false;
			try {
				dd.tests.html.util.render(template);
			}catch(e){
				t.is("Content should not exist outside of the root node in template", e.message);
				found = true;
			}
			t.t(found);

			// Logic block rules out any root node
			template = new dd.HtmlTemplate('{% if missing %}<div></div>{% endif %}');
			found = false;
			try {
				dd.tests.html.util.render(template);
			}catch(e){
				t.is("Rendered template does not have a root node", e.message);
				found = true;
			}
			t.t(found);
		},
		function test_structures(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				actions: ["ate", "picked"],
				items: [
					{
						name: "apple"
					},
					{
						name: "banana",
						date: new Date(2007, 2, 16, 14, 30, 10)
					},
					{
						name: "orange",
						date: new Date(2008, 0, 1, 12, 0, 0)
					}
				]
			});

			var template = new dd.HtmlTemplate('<div><ul>I {% for action in actions %}{% if not forloop.first %}, {% endif %}{{action}}{% endfor %} the following:<ul>{% for item in items %}<li>{{ item.name }}{% if item.date %} at {{ item.date|date:"P" }}{% endif %}</li>{% endfor %}</ul></ul></div>');
			t.is('<div><ul>I ate, picked the following:<ul><li>apple</li><li>banana at 2:30 pm</li><li>orange at noon</li></ul></ul></div>', dd.tests.html.util.render(template, context));
		},
		function test_tag_extend(t){
			// Problems to look for:
			//	* Content outside of blocks
		},
		function test_tag_for(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				items: ["apple", "banana", "lemon"]
			});
			var template = new dd.HtmlTemplate('<div><ul>{% for item in items %}<li class="{{ item|length }}">{{ item }}</li>{% endfor %}</ul></div>');

			t.is('<div><ul><li class="5">apple</li><li class="6">banana</li><li class="5">lemon</li></ul></div>', dd.tests.html.util.render(template, context));

			// The line break is there to make sure our regex works
			template = new dd.HtmlTemplate('<div><select>{% for item in items %}<option>{{ item }}</option>\n{% endfor %}</select></div>');

			t.is('<div><select><option>apple</option><option>banana</option><option>lemon</option></select></div>', dd.tests.html.util.render(template, context));
		},
		function test_tag_if(t){
			var dd = dojox.dtl;

			var context = new dd.Context({key: true});
			var template = new dd.HtmlTemplate('{% if key %}<div>has key</div>{% else %}<div>no key</div>{% endif %}');
			t.is("<div>has key</div>", dd.tests.html.util.render(template, context));
			context.key = false;
			t.is("<div>no key</div>", dd.tests.html.util.render(template, context));
		},
		function test_tag_ifchanged(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				year: 2008,
				days: [
					new Date(2008, 0, 12),
					new Date(2008, 0, 28),
					new Date(2008, 1, 1),
					new Date(2008, 1, 1),
					new Date(2008, 1, 1)
				]
			});

			var template = new dd.HtmlTemplate("<div><h1>Archive for {{ year }}</h1>"+
"{% for date in days %}"+
'{% ifchanged %}<h3>Month: </h3><h3>{{ date|date:"F" }}</h3>{% endifchanged %}'+
'<a href="{{ date|date:\'M/d\'|lower }}/">{{ date|date:\'j\' }}</a>'+
"{% endfor %}</div>");

			t.is('<div><h1>Archive for 2008</h1>'+
'<h3>Month: </h3><h3>January</h3>'+
'<a href="jan/12/">12</a>'+
'<a href="jan/28/">28</a>'+
'<h3>Month: </h3><h3>February</h3>'+
'<a href="feb/01/">1</a>'+
'<a href="feb/01/">1</a>'+
'<a href="feb/01/">1</a></div>', dd.tests.html.util.render(template, context));

			template = new dd.HtmlTemplate('<div>{% for date in days %}'+
'{% ifchanged date.date %} {{ date.date }} {% endifchanged %}'+
'{% ifchanged date.hour date.date %}'+
'{{ date.hour }}'+
'{% endifchanged %}'+
'{% endfor %}</div>');
			t.is('<div> 2008-01-12 0 2008-01-28 0 2008-02-01 0</div>', dd.tests.html.util.render(template, context));
		},
		function test_tag_ifequal(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				items: [
					{ name: "apple", color: "red" },
					{ name: "banana", color: "yellow" },
					{ name: "pear", color: "green" },
					{ name: "kiwi", color: "brown" }
				],
				edit_item: "banana"
			});

			var template = new dd.HtmlTemplate("<div><ul>{% for item in items %}<li>{{ item.name }}</li>{% endfor %}</ul></div>");
			t.is('<div><ul><li>apple</li><li>banana</li><li>pear</li><li>kiwi</li></ul></div>', dd.tests.html.util.render(template, context));

			template = new dd.HtmlTemplate("<div><ul>{% for item in items %}<li><span>{{ item.name }}</span><br/><p>{{ item.color }}</p></li>{% endfor %}</ul></div>");
			t.is('<div><ul><li><span>apple</span><br/><p>red</p></li><li><span>banana</span><br/><p>yellow</p></li><li><span>pear</span><br/><p>green</p></li><li><span>kiwi</span><br/><p>brown</p></li></ul></div>', dd.tests.html.util.render(template, context));

			template = new dd.HtmlTemplate("<div><ul>{% for item in items %}<li>{% ifequal item.name edit_item %}<label>Name: <input type='text' name='name' value=\"{{ item.name }}\"/></label><br/><label>Color: <textarea name='color'>{{ item.color }}</textarea></label>{% else %}<span>{{ item.name }}</span><br/><p>{{ item.color }}</p>{% endifequal %}</li>{% endfor %}</ul></div>");
			t.is('<div><ul><li><span>apple</span><br/><p>red</p></li><li><label>Name: <input type="text" name="name" value="banana"/></label><br/><label>Color: <textarea name="color">yellow</textarea></label></li><li><span>pear</span><br/><p>green</p></li><li><span>kiwi</span><br/><p>brown</p></li></ul></div>', dd.tests.html.util.render(template, context));

			template = new dd.HtmlTemplate("<div><ul>{% for item in items %}<li>{% ifequal item.name edit_item %}<div><label>Name: <input type='text' name='name' value=\"{{ item.name }}\"/></label><br/><label>Color: <textarea name='color'>{{ item.color }}</textarea></label></div>{% else %}<div><span>{{ item.name }}</span><br/><p>{{ item.color }}</p></div>{% endifequal %}</li>{% endfor %}</ul></div>");
			t.is('<div><ul><li><div><span>apple</span><br/><p>red</p></div></li><li><div><label>Name: <input type="text" name="name" value="banana"/></label><br/><label>Color: <textarea name="color">yellow</textarea></label></div></li><li><div><span>pear</span><br/><p>green</p></div></li><li><div><span>kiwi</span><br/><p>brown</p></div></li></ul></div>', dd.tests.html.util.render(template, context));

			template = new dd.HtmlTemplate("<div><ul>{% for item in items %}{% ifequal item.name edit_item %}<li><label>Name: <input type='text' name='name' value=\"{{ item.name }}\"/></label><br/><label>Color: <textarea name='color'>{{ item.color }}</textarea></label></li>{% else %}<li><span>{{ item.name }}</span><br/><p>{{ item.color }}</p></li>{% endifequal %}{% endfor %}</ul></div>");
			t.is('<div><ul><li><span>apple</span><br/><p>red</p></li><li><label>Name: <input type="text" name="name" value="banana"/></label><br/><label>Color: <textarea name="color">yellow</textarea></label></li><li><span>pear</span><br/><p>green</p></li><li><span>kiwi</span><br/><p>brown</p></li></ul></div>', dd.tests.html.util.render(template, context));
		},
		function test_tag_include(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				hello: dojo.moduleUrl("dojox.dtl.tests.templates", "hello.html"),
				person: "Bob",
				people: ["Charles", "Ralph", "Julia"]
			});

			var template = new dd.HtmlTemplate("<div>{% include hello %}</div>");
			t.is("<div>Hello, <span>Bob</span></div>", dd.tests.html.util.render(template, context));

			template = new dd.HtmlTemplate('<div>{% include "../../dojox/dtl/tests/templates/hello.html" %}</div>');
			t.is("<div>Hello, <span>Bob</span></div>", dd.tests.html.util.render(template, context));

			template = new dd.HtmlTemplate('<div>{% for person in people %}<div class="include">{% include hello %} </div>{% endfor %}</div>');
			t.is('<div><div class="include">Hello, <span>Charles</span> </div><div class="include">Hello, <span>Ralph</span> </div><div class="include">Hello, <span>Julia</span> </div></div>', dd.tests.html.util.render(template, context));
		},
		function test_tag_spaceless(t){
			var dd = dojox.dtl;

			var template = new dd.HtmlTemplate("{% spaceless %}<ul> \n <li>Hot</li> \n\n<li>Pocket </li>\n </ul>{% endspaceless %}");
			t.is("<ul><li>Hot</li><li>Pocket </li></ul>", dd.tests.html.util.render(template));
		},
		function test_tag_ssi(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				hello: dojo.moduleUrl("dojox.dtl.tests.templates", "hello.html"),
				person: "Bob",
				people: ["Charles", "Ralph", "Julia"]
			});

			var template = new dd.HtmlTemplate("<div>{% ssi hello parsed %}</div>");
			t.is("<div>Hello, <span>Bob</span></div>", dd.tests.html.util.render(template, context));

			template = new dd.HtmlTemplate("<div>{% ssi hello %}</div>");
			t.is("<div>Hello, <span>{{ person }}</span></div>", dd.tests.html.util.render(template, context));

			template = new dd.HtmlTemplate('<div>{% ssi "../../dojox/dtl/tests/templates/hello.html" parsed %}</div>');
			t.is("<div>Hello, <span>Bob</span></div>", dd.tests.html.util.render(template, context));

			template = new dd.HtmlTemplate('<div>{% for person in people %}{% ssi hello parsed %} {% endfor %}</div>');
			t.is("<div>Hello, <span>Charles</span> Hello, <span>Ralph</span> Hello, <span>Julia</span> </div>", dd.tests.html.util.render(template, context));
		}
	]
);

}
