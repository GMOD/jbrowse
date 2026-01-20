define(['require', '.'], function(require, main) {
	return function() {
		main.should.be.eql("bar/main");
		require('.').should.be.eql("bar/main");
		require.toUrl('bar/main').should.be.eql('sub/bar/main');
	};
});