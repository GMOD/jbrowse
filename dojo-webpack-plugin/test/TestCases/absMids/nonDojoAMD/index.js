define(['pkg1', 'pkg2'], function(pkg1, pkg2) {
	it("Should load cjs modules without duplicate absMid error", function() {
		pkg1.should.be.eql('pkg1');
		pkg2.should.be.eql('pkg2');
	});
});