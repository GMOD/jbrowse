define("require,dojo/has,dojo/has!foo?./a:./b".split(","), function(require, has, m1) {
  it("should load module based on runtime value of foo", function(done) {
    has("webpack").should.be.ok();
		(typeof(has('foo')) === 'undefined').should.be.true();
    m1.should.be.eql("b");
		require("./b").should.be.eql(m1);
    has.add("foo", true, true, true);
		try {
	    require("dojo/has!foo?./c:./d,exports".split(","), function(m2) {
	      // module should have been set at build time and not changed just because foo changed
	      has("foo").should.be.ok();
	      m2.should.be.eql("c");
	      done();
	    });
		} catch(e) {
			done(e);
		}
  });
});
