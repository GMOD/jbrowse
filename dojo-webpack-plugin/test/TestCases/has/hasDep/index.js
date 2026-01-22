define(["dojo/has!foo?:./a"], function(m1) {
  it("should load true module", function() {
    m1.should.be.eql("a");
  });
});
