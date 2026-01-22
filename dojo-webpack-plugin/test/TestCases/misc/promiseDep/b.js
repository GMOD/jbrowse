define([], function () {
  return new Promise(function(resolve) {
		setTimeout(function () {
			resolve('b');
    }, 1000);
	});
});
