define([], function () {
  return new Promise(function(resolve) {
		setTimeout(function () {
			resolve('c');
    }, 1000);
	});
});
