define([], function () {
  return new Promise(function(resolve) {
		setTimeout(function () {
			resolve('a');
    }, 1000);
	});
});
