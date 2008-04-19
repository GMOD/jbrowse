if(!dojo._hasResource["dojox.lang.tests.misc"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.lang.tests.misc"] = true;
dojo.provide("dojox.lang.tests.misc");

dojo.require("dojox.lang.functional.object");
dojo.require("dojox.lang.functional.zip");

(function(){
	var df = dojox.lang.functional, fun = df.lambda("100*a + 10*b + c"), result = [];
	df.forIn({a: 1, b: 2}, function(v, i){ result.push("[" + i + "] = " + v); });
	
	tests.register("dojox.lang.tests.misc", [
		function testZip1(t){ t.assertEqual(df.zip([1, 2, 3], [4, 5, 6]), [[1, 4], [2, 5], [3, 6]]); },
		function testZip2(t){ t.assertEqual(df.zip([1, 2], [3, 4], [5, 6]), [[1, 3, 5], [2, 4, 6]]); },
		
		function testUnzip1(t){ t.assertEqual(df.unzip([[1, 4], [2, 5], [3, 6]]), [[1, 2, 3], [4, 5, 6]]); },
		function testUnzip2(t){ t.assertEqual(df.unzip([[1, 3, 5], [2, 4, 6]]), [[1, 2], [3, 4], [5, 6]]); },
		
		function testMixer(t){ t.assertEqual(df.mixer(fun, [1, 2, 0])(3, 1, 2), 123); },
		function testFlip(t){ t.assertEqual(df.flip(fun)(3, 2, 1), 123); },
		
		function testCompose1(t){ t.assertEqual(df.lambda(["+5", "*3"])(8), 8 * 3 + 5); },
		function testCompose2(t){ t.assertEqual(df.lambda(["+5", "*3"].reverse())(8), (8 + 5) * 3); },
		
		function testForIn(t){ t.assertEqual(result.sort().join(", "), "[a] = 1, [b] = 2"); },
		function testKeys(t){ t.assertEqual(df.keys({a: 1, b: 2, c: 3}), ["a", "b", "c"]); },
		function testValues(t){ t.assertEqual(df.values({a: 1, b: 2, c: 3}), [1, 2, 3]); }
	]);
})();

}
