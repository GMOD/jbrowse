define(["require", "dojo/has", "dojo/has!foo?./a:./b", "dojo/has!foo?:undef"], function(require, has, m1, undef) {
  it("should load true module", function(done) {
    has("webpack").should.be.ok();
    m1.should.be.eql("a");
		(typeof undef === 'undefined').should.be.true();
    has.add("foo", false, true, true);
		try {
	    require(["dojo/has!foo?./c:./d"], function(m2) {
	      has("foo").should.not.be.ok();
				// module should have been set at build time and not changed just because foo changed
	      m2.should.be.eql("c");
	      done();
	    });
		} catch(e) {
			done(e);
		}
  });
});
