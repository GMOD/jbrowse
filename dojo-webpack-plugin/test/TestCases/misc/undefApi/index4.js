define(['dojo/has', 'has!a?test/a', 'has!b?test/b'], function(has, a, b) {
	it('should load or not load a according to has condition but always load b', function() {
		if (has('a')) {
			a.label.should.be.eql("a");
		} else {
			(typeof a).should.be.eql('undefined');
		}
		b.label.should.be.eql("b");
	});
});