if(!dojo._hasResource["dojox.rpc.tests.JsonReferencing"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.rpc.tests.JsonReferencing"] = true;
dojo.provide("dojox.rpc.tests.JsonReferencing");
dojo.require("dojox.rpc.JsonReferencing");


doh.register("dojox.rpc.tests.JsonReferencing", [
	function fromRefJson(t) {
			var testStr = '{a:{$ref:"$"},id:"root",c:{d:"e",f:{$ref:"root.c"}},b:{$ref:"$.c"}}';

			var mirrorObj = dojox.rpc.fromJson(testStr);
			t.assertEqual(mirrorObj, mirrorObj.a);
			t.assertEqual(mirrorObj.c, mirrorObj.c.f);
			t.assertEqual(mirrorObj.c, mirrorObj.b);
	},
	function toAndFromRefJson(t) {
			var testObj = {a:{},b:{c:{}}};
			testObj.a.d= testObj;
			testObj.b.g=testObj.a;
			testObj.b.c.f = testObj.b;
			testObj.b.h=testObj.a;
			var mirrorObj = dojox.rpc.fromJson(dojox.rpc.toJson(testObj));
			t.assertEqual(mirrorObj.a.d, mirrorObj);
			t.assertEqual(mirrorObj.b.g, mirrorObj.a);
			t.assertEqual(mirrorObj.b.c.f, mirrorObj.b);
			t.assertEqual(mirrorObj.b.h, mirrorObj.a);
	}
]);

}
