define([], function () {
  return new Promise(function(resolve) {
		setTimeout(function () {
			resolve('Done!');
    }, 1000);
	});
});
