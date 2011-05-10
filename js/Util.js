var Util = {};

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
};

Util.wheel = function(event){
    var delta = 0;
    if (!event) event = window.event;
    if (event.wheelDelta) {
        delta = event.wheelDelta/120;
        if (window.opera) delta = -delta;
    } else if (event.detail) { delta = -event.detail/3;	}
    return Math.round(delta); //Safari Round
};

Util.isRightButton = function(e) {
    if (!e) var e = window.event;
    if (e.which) return e.which == 3;
    else if (e.button) return e.button == 2;
};

Util.getViewportWidth = function() {
  var width = 0;
  if( document.documentElement && document.documentElement.clientWidth ) {
    width = document.documentElement.clientWidth;
  }
  else if( document.body && document.body.clientWidth ) {
    width = document.body.clientWidth;
  }
  else if( window.innerWidth ) {
    width = window.innerWidth - 18;
  }
  return width;
};

Util.getViewportHeight = function() {
  var height = 0;
  if( document.documentElement && document.documentElement.clientHeight ) {
    height = document.documentElement.clientHeight;
  }
  else if( document.body && document.body.clientHeight ) {
    height = document.body.clientHeight;
  }
  else if( window.innerHeight ) {
    height = window.innerHeight - 18;
  }
  return height;
};

Util.findNearest = function(numArray, num) {
    var minIndex = 0;
    var min = Math.abs(num - numArray[0]);
    for (var i = 0; i < numArray.length; i++) {
        if (Math.abs(num - numArray[i]) < min) {
            minIndex = i;
            min = Math.abs(num - numArray[i]);
        }
    }
    return minIndex;
};

/**
 * replace variables in a template string with values
 * @param template String with variable names in curly brackets
 *                 e.g., "http://foo/{bar}?arg={baz}
 * @param fillWith object with attribute-value mappings
 *                 e.g., {'bar': 'someurl', 'baz': 'valueforbaz'}
 * @returns the template string with variables in fillWith replaced
 *                 e.g., 'htp://foo/someurl?arg=valueforbaz'
 */
Util.fillTemplate = function(template, fillWith) {
    return template.replace(/\{([^}]+)\}/g,
                            function(match, group) {
                                if (fillWith[group] !== undefined)
                                    return fillWith[group];
                                else
                                    return "{" + group + "}";
                            });
};

/**
 * function to load a specified resource only once
 * @param url URL to get
 * @param stateObj object that stores the state of the load
 * @param successCalback function to call on a successful load
 * @param errorCallback function to call on an unsuccessful load
 */
Util.maybeLoad = function (url, stateObj, successCallback, errorCallback) {
    if (stateObj.state) {
        if ("loaded" == stateObj.state) {
            successCallback(stateObj.data);
        } else if ("error" == stateObj.state) {
            errorCallback();
        } else if ("loading" == stateObj.state) {
            stateObj.successCallbacks.push(successCallback);
            if (errorCallback) stateObj.errorCallbacks.push(errorCallback);
        }
    } else {
        stateObj.state = "loading";
        stateObj.successCallbacks = [successCallback];
        stateObj.errorCallbacks = [errorCallback];
        dojo.xhrGet(
            {
                url: url,
                handleAs: "json",
                load: function(o) {
                    stateObj.state = "loaded";
                    stateObj.data = o;
                    var cbs = stateObj.successCallbacks;
                    for (var c = 0; c < cbs.length; c++) cbs[c](o);
                },
                error: function() {
                    stateObj.state = "error";
                    var cbs = stateObj.errorCallbacks;
                    for (var c = 0; c < cbs.length; c++) cbs[c]();
                }
            });
    }
};

/**
 * updates a with values from b, recursively
 */
Util.deepUpdate = function(a, b) {
    for (var prop in b) {
        if ((prop in a)
            && ("object" == typeof b[prop])
            && ("object" == typeof a[prop]) ) {
            Util.deepUpdate(a[prop], b[prop]);
        } else {
            a[prop] = b[prop];
        }
    }
};

// from http://bugs.dojotoolkit.org/ticket/5794
Util.resolveUrl = function(baseUrl, relativeUrl) {
    // summary:
    // This takes a base url and a relative url and resolves the target url.
    // For example:
    // resolveUrl("http://www.domain.com/path1/path2","../path3") ->"http://www.domain.com/path1/path3"
    //
    if (relativeUrl.match(/\w+:\/\//))
	return relativeUrl;
    if (relativeUrl.charAt(0)=='/') {
	baseUrl = baseUrl.match(/.*\/\/[^\/]*/);
	return (baseUrl ? baseUrl[0] : '') + relativeUrl;
    }
    //TODO: handle protocol relative urls:  ://www.domain.com
    baseUrl = baseUrl.substring(0,baseUrl.length - baseUrl.match(/[^\/]*$/)[0].length);// clean off the trailing path
    if (relativeUrl == '.')
	return baseUrl;
    while (relativeUrl.substring(0,3) == '../') {
	baseUrl = baseUrl.substring(0,baseUrl.length - baseUrl.match(/[^\/]*\/$/)[0].length);
	relativeUrl = relativeUrl.substring(3);
    }
    return baseUrl + relativeUrl;
};

if (!Array.prototype.reduce)
{
  Array.prototype.reduce = function(fun /*, initial*/)
  {
    var len = this.length;
    if (typeof fun != "function")
      throw new TypeError();

    // no value to return if no initial value and an empty array
    if (len == 0 && arguments.length == 1)
      throw new TypeError();

    var i = 0;
    if (arguments.length >= 2)
    {
      var rv = arguments[1];
    }
    else
    {
      do
      {
        if (i in this)
        {
          rv = this[i++];
          break;
        }

        // if array contains no values, no initial value to return
        if (++i >= len)
          throw new TypeError();
      }
      while (true);
    }

    for (; i < len; i++)
    {
      if (i in this)
        rv = fun.call(null, rv, this[i], i, this);
    }

    return rv;
  };
}

if (!Array.prototype.map)
{
  Array.prototype.map = function(fun /*, thisp */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function")
      throw new TypeError();

    var res = new Array(len);
    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in t)
        res[i] = fun.call(thisp, t[i], i, t);
    }

    return res;
  };
}

if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(searchElement /*, fromIndex */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (len === 0)
      return -1;

    var n = 0;
    if (arguments.length > 0)
    {
      n = Number(arguments[1]);
      if (n !== n) // shortcut for verifying if it's NaN
        n = 0;
      else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }

    if (n >= len)
      return -1;

    var k = n >= 0
          ? n
          : Math.max(len - Math.abs(n), 0);

    for (; k < len; k++)
    {
      if (k in t && t[k] === searchElement)
        return k;
    }
    return -1;
  };
}

function Finisher(fun) {
    this.fun = fun;
    this.count = 0;
}

Finisher.prototype.inc = function() {
    this.count++;
};

Finisher.prototype.dec = function() {
    this.count--;
    this.finish();
};

Finisher.prototype.finish = function() {
    if (this.count <= 0) this.fun();
};


/*
    class for operating on indexed representations of objects

    For example, if we have a lot of objects with similar attributes, e.g.:
        [
            {start: 1, end: 2, strand: -1},
            {start: 5, end: 6, strand: 1},
            ...
        ]
    we can represent them more compactly (e.g., in JSON) something like this:
        class = ["start", "end", "strand"]
        [
            [1, 2, -1],
            [5, 6, 1],
            ...
        ]

    If we want to represent a few different kinds of objects in our big list,
    we can have multiple "class" arrays, and tag each object to identify
    which "class" array describes it.

    For example, if we have a lot of instances of a few types of objects,
    like this:
        [
            {start: 1, end: 2, strand: 1, id: 1},
            {start: 5, end: 6, strand: 1, id: 2},
            ...
            {start: 10, end: 20, chunk: 1},
            {start: 30, end: 40, chunk: 2},
            ...
        ]
    We could use the first array position to indicate the "class" for the
    object, like this:
        classes = [["start", "end", "strand", "id"], ["start", "end", "chunk"]]
        [
            [0, 1, 2, 1, 1],
            [0, 5, 6, 1, 2],
            ...
            [1, 10, 20, 1],
            [1, 30, 40, 1]
        ]
    Also, if we occasionally want to add an ad-hoc attribute, we could just
    stick an optional dictionary onto the end:
        classes = [["start", "end", "strand", "id"], ["start", "end", "chunk"]]
        [
            [0, 1, 2, 1, 1],
            [0, 5, 6, 1, 2, {foo: 1}]
        ]

    Given that individual objects are being represented by arrays, generic
    code needs some way to differentiate arrays that are meant to be objects
    from arrays that are actually meant to be arrays.
    So for each class, we include a dict with <attribute name>: true mappings
    for each attribute that is meant to be an array.

    Also, in cases where some attribute values are the same for all objects
    in a particular set, it may be convenient to define a "prototype"
    with default values for all objects in the set

    In the end, we get something like this:

        classes=[
            {'attributes': ['Start', 'End', 'Subfeatures'],
             'proto': {'Chrom': 'chr1'},
             'isArrayAttr': {Subfeatures: true}}
            ]

    That's what this class facilitates.
    """
        

*/
function ArrayRepr (classes) {
    this.classes = classes;
    this.fields = [];
    for (var cl = 0; cl < classes.length; cl++) {
        this.fields[cl] = {};
        for (var f = 0; f < classes[cl].attributes.length; f++) {
            this.fields[cl][classes[cl].attributes[f]] = f + 1;
        }
        if (classes[cl].proto === undefined)
            classes[cl].proto = {};
        if (classes[cl].isArrayAttr === undefined)
            classes[cl].isArrayAttr = {};
    }
}

ArrayRepr.prototype.attrIndices = function(attr) {
    return this.classes.map(
        function(x) {
            var i = x.attributes.indexOf(attr);
            return i >= 0 ? i + 1 : undefined;
        }
    );
};

ArrayRepr.prototype.get = function(obj, attr) {
    if (attr in this.fields[obj[0]]) {
        return obj[this.fields[obj[0]][attr]];
    } else {
        var adhocIndex = this.classes[obj[0]].attributes.length + 1;
        if ((adhocIndex >= obj.length) || (not(attr in obj[adhocIndex]))) {
            if (attr in this.classes[obj[0]].proto)
                return this.classes[obj[0]].proto[attr];
            return undefined;
        }
        return obj[adhocIndex][attr];
    }
};

ArrayRepr.prototype.fastGet = function(obj, attr) {
    // can be used only if attr is guaranteed to be in
    // the "classes" array for this object
    return obj[self.fields[obj[0]][attr]];
};

ArrayRepr.prototype.set = function(obj, attr, val) {
    if (attr in this.fields[obj[0]]) {
        obj[this.fields[obj[0]][attr]] = val;
    } else {
        var adhocIndex = len(self.classes[obj[0]]) + 1;
        if (adhocIndex >= obj.length)
            obj[adhocIndex] = {};
        obj[adhocIndex][attr] = val;
    }
};

ArrayRepr.prototype.fastSet = function(obj, attr, val) {
    // can be used only if attr is guaranteed to be in
    // the "classes" array for this object
    obj[this.fields[obj[0]][attr]] = val;
};

ArrayRepr.prototype.makeSetter = function(attr) {
    var self = this;
    return function(obj, val) { self.set(obj, attr, val); };
};

ArrayRepr.prototype.makeGetter = function(attr) {
    var self = this;
    return function(obj) { self.get(obj, attr); };
};

ArrayRepr.prototype.makeFastSetter = function(attr) {
    // can be used only if attr is guaranteed to be in
    // the "classes" array for this object
    var indices = this.attrIndices(attr);
    return function(obj, val) {
        if (indices[obj[0]] !== undefined)
            obj[indices[obj[0]]] = val;
    };
};

ArrayRepr.prototype.makeFastGetter = function(attr) {
    // can be used only if attr is guaranteed to be in
    // the "classes" array for this object
    var indices = this.attrIndices(attr);
    return function(obj) {
        if (indices[obj[0]] !== undefined)
            return obj[indices[obj[0]]];
        else
            return undefined;
    };
};

ArrayRepr.prototype.construct = function(self, obj, klass) {
    var result = new Array(self.classes[klass].length);
    for (var attr in obj) {
        this.set(result, attr, obj[attr]);
    }
    return result;
};

/*

Copyright (c) 2007-2010 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
