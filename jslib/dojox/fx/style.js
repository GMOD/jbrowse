if(!dojo._hasResource["dojox.fx.style"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.fx.style"] = true;
dojo.provide("dojox.fx.style");
dojo.experimental("dojox.fx.style"); 
//
// summary: dojox.fx CSS Class _Animations: 
//
// description: a set of functions to animate properties based on
// 	normalized CSS class definitions.
//
//	provides: addClass, removeClass, and toggleClass
//	
dojo.require("dojox.fx._base"); 

// FIXME: should the call signatures match dojo.addClass/removeClass/toggleClass and extend
// 	by having a third (or fourth) param to mix in additional _Animation args for advanced
//	usage (delay: curve: repeat: easing: etc ... )

dojox.fx.addClass = function(/*dojox.fx._arg.StyleArgs*/ args){
	// summary: Animate the effects of adding a class to a node
	// description:
	//	Creates an animation that will animate
	//	the properties of a node to the properties
	//	defined in a standard CSS .class definition.
	//	(calculating the differences itself)
	//
	// example:
	// | 
	// |	.bar { line-height: 12px; }
	// |	.foo { line-height: 40px; }
	// |	<div class="bar" id="test">
	// |	Multi<br>line<br>text
	// |	</div> 
	// |
	// |	// animate to line-height:40px
	// |	dojo.fx.addClass({ node:"test", cssClass:"foo" }).play();
	// 
	var node = (args.node = dojo.byId(args.node)); 

	var pushClass = (function(n){
		// summary: onEnd we want to add the class to the node 
		//	(as dojo.addClass naturally would) in case our 
		//	class parsing misses anything the browser would 
		// 	otherwise interpret. this may cause some flicker,
		//	and will only apply the class so children can inherit 
		//	after the animation is done (potentially more flicker)
		return function(){
			dojo.addClass(n, args.cssClass); 
			n.style.cssText = _beforeStyle; 
		}
	})(node);

	// _getCalculatedStleChanges is the core of our style/class animations
	var mixedProperties = dojox.fx._getCalculatedStyleChanges(args,true);
	var _beforeStyle = node.style.cssText; 
	var _anim = dojo.animateProperty(dojo.mixin({
		properties: mixedProperties
	},args));
	dojo.connect(_anim,"onEnd",_anim,pushClass); 
	return _anim; // dojo._Animation
};

dojox.fx.removeClass = function(/*dojox.fx._arg.StyleArgs*/ args){
	// summary: Animate the effects of removing a class from a node
	// description:
	//	Creates an animation that will animate the properties of a 
	// 	node (args.node) to the properties calculated after removing 
	//	a standard CSS className from a that node.
	//	
	//	calls dojo.removeClass(args.cssClass) onEnd of animation		
	//
	//	standard dojo._Animation object rules apply. 
	//
	// example:
	// |	// animate the removal of "foo" from a node with id="bar"
	// |	dojox.fx.removeClass({
	// |		node: "bar",
	// |		cssClass: "foo"
	// |	}).play();

	var node = (args.node = dojo.byId(args.node)); 

	var pullClass = (function(n){
		// summary: onEnd we want to remove the class from the node 
		//	(as dojo.removeClass naturally would) in case our class
		//	parsing misses anything the browser would otherwise 
		//	interpret. this may cause some flicker, and will only 
		//	apply the class so children can inherit after the
		//	animation is done (potentially more flicker)
		//
		return function(){
			dojo.removeClass(n, args.cssClass); 
			n.style.cssText = _beforeStyle; 
		}
	})(node);

	var mixedProperties = dojox.fx._getCalculatedStyleChanges(args,false);
	var _beforeStyle = node.style.cssText; 
	var _anim = dojo.animateProperty(dojo.mixin({
		properties: mixedProperties
	},args));
	dojo.connect(_anim,"onEnd",_anim,pullClass); 
	return _anim; // dojo._Animation
};

dojox.fx.toggleClass = function(/*DomNode|String*/node, /*String*/cssClass, /*Boolean?*/condition){
        // summary:
	//	Animate the effects of Toggling a class on a Node
	//
	// description:
	//	creates an animation that will animate the effect of 
	//	toggling a class on or off of a node.
        //	Adds a class to node if not present, or removes if present.
        //	Pass a boolean condition if you want to explicitly add or remove.
	// node:
	//	The domNode (or string of the id) to toggle
	// cssClass:
	//	String of the classname to add to the node
        // condition:
        //	If passed, true means to add the class, false means to remove.
	//
	// example:
	// |	// add the class "sampleClass" to a node id="theNode"
	// |	dojox.fx.toggleClass("theNode","sampleClass",true).play();
	// example:
	// |	// toggle the class "sampleClass" on the node id="theNode"
	// |	dojox.fx.toggleClass("theNode","sampleClass").play();
	
        if(typeof condition == "undefined"){
                condition = !dojo.hasClass(node, cssClass);
        }
        return dojox.fx[(condition ? "addClass" : "removeClass")]({ node: node, cssClass:cssClass }); // dojo._Animation
	// TODO: support 4th param animMixin to allow passing of easing and duration and other _Animtion options
};

dojox.fx._allowedProperties = [
	// summary: Our pseudo map of properties we will check for.
	// description:
	//	it should be much more intuitive. a way to normalize and
	//	"predict" intent, or even something more clever ... 
	//	open to suggestions.

	// no-brainers:
	"width",
	"height",
	// only if position = absolute || relative?
	"left", "top", // "right", "bottom", 
	// these need to be filtered through dojo.colors?
	// "background", // normalize to:
	/* "backgroundImage", */
	// "backgroundPosition", // FIXME: to be effective, this needs "#px #px"?
	"backgroundColor",

	"color",

	// "border", 
	"borderBottomColor", "borderBottomWidth",
	"borderTopColor","borderTopWidth",
	"borderLeftColor","borderLeftWidth",
	"borderRightColor","borderRightWidth",

	// "padding", // normalize to: 
	"paddingLeft", "paddingRight", "paddingTop", "paddingBottom",
	// "margin", // normalize to:
	"marginLeft", "marginTop", "marginRight", "marginBottom",

	// unit import/delicate?:
	"lineHeight",
	"letterSpacing",
	"fontSize"
];

dojox.fx._getStyleSnapshot = function(/* Object */cache){
	// summary: 
	//	uses a dojo.getComputedStyle(node) cache reference and
	// 	iterates through the 'documented/supported animate-able'
	// 	properties. 
	//
	// returns:  Array
	//	an array of raw, calculcated values (no keys), to be normalized/compared
	//	elsewhere	
	return dojo.map(dojox.fx._allowedProperties,function(style){
		return cache[style]; // String
	}); // Array
};

dojox.fx._getCalculatedStyleChanges = function(/*dojox.fx._arg.StyleArgs*/ args, /*Boolean*/addClass){
	// summary: calclate the difference in style properties between two states
	// description:
	//	calculate and normalize(?) the differences between two states
	//	of a node (args.node) by quickly adding or removing a class, and
	//	iterateing over the results of dojox.fx._getStyleSnapshot()
	//
	// addClass: 
	// 	true to calculate what adding a class would do, 
	// 	false to calculate what removing the class would do

	var node = (args.node = dojo.byId(args.node)); 
	var cs = dojo.getComputedStyle(node);

	// take our snapShots
	var _before = dojox.fx._getStyleSnapshot(cs);
	dojo[(addClass ? "addClass" : "removeClass")](node,args.cssClass); 
	var _after = dojox.fx._getStyleSnapshot(cs);
	dojo[(addClass ? "removeClass" : "addClass")](node,args.cssClass); 

	var calculated = {};
	var i = 0;
	dojo.forEach(dojox.fx._allowedProperties,function(prop){
		if(_before[i] != _after[i]){
			// FIXME: the static unit: px is not good, either. need to parse unit from computed style?
			calculated[prop] = { end: parseInt(_after[i]) /* start: parseInt(_before[i]), unit: 'px' */ }; 
		} 
		i++;
	});
	return calculated; 
};

}
