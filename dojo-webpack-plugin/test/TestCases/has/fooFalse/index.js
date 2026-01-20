define(["require", "dojo/has", "dojo/has!foo?./a:./b", "dojo/has!foo?undef"], function(require, has, m1, undef) {

  it("should load false module", function(done) {
    has("webpack").should.be.ok();
    has("foo").should.not.be.ok();
    m1.should.be.eql("b");
		(typeof undef === 'undefined').should.be.true();
    has.add("foo", true, true, true);
		try {
	    require(["dojo/has!foo?./c:./d"], function(m2) {
	      // module should have been set at build time and not changed just because foo changed
	      has("foo").should.be.ok();
	      m2.should.be.eql("d");
	      done();
	    });
		} catch(e) {
			done(e);
		}
  });
});
