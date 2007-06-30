var Util = {};

function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (typeof element == 'string')
    element = document.getElementById(element);
  return element;
}

Util.is_ie = navigator.appVersion.indexOf('MSIE') >= 0;
Util.is_ie6 = navigator.appVersion.indexOf('MSIE 6') >= 0;
Util.addCommas = function(nStr)
{
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

Util.wheel = function(event){
    var delta = 0;
    if (!event) event = window.event;
    if (event.wheelDelta) {
        delta = event.wheelDelta/120; 
        if (window.opera) delta = -delta;
    } else if (event.detail) { delta = -event.detail/3;	}
    return Math.round(delta); //Safari Round
}

Util.isRightButton = function(e) {
    if (!e) var e = window.event;
    if (e.which) return e.which == 3;
    else if (e.button) return e.button == 2;
}