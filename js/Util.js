// MISC

/**
 * @namespace
 */

var Util = {};

Util.is_ie = navigator.appVersion.indexOf('MSIE') >= 0;
Util.is_ie6 = navigator.appVersion.indexOf('MSIE 6') >= 0;
Util.addCommas = function(nStr)
{
	nStr += '';
	var x = nStr.split('.');
	var x1 = x[0];
	var x2 = x.length > 1 ? '.' + x[1] : '';
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
 * @param {Object}   dojoXhrArgs object containing arguments for dojo.xhrGet,
 *                               like <code>url</code> and <code>handleAs</code>
 * @param {Object}   stateObj object that stores the state of the load
 * @param {Function} successCallback function to call on a successful load
 * @param {Function} errorCallback function to call on an unsuccessful load
 */
Util.maybeLoad = function ( dojoXhrArgs, stateObj, successCallback, errorCallback) {
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

        var args = dojo.clone( dojoXhrArgs );
        args.load = function(o) {
            stateObj.state = "loaded";
            stateObj.data = o;
            var cbs = stateObj.successCallbacks;
            for (var c = 0; c < cbs.length; c++) cbs[c](o);
        };
        args.error = function(error) {
            console.error(''+error);
            stateObj.state = "error";
            var cbs = stateObj.errorCallbacks;
            for (var c = 0; c < cbs.length; c++) cbs[c]();
        };

        dojo.xhrGet( args );
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
        } else if( typeof a[prop] == 'undefined' || typeof b[prop] != undefined ){
            a[prop] = b[prop];
        }
    }
    return a;
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

Util.parseLocString = function( locstring ) {
    locstring = dojo.trim( locstring );

    //                                (chromosome)    (    start      )   (  sep     )     (    end   )
    var matches = locstring.match(/^(((\S*)\s*:)?\s*(-?[\d,.']+)\s*(\.\.|-|\s+))?\s*(-?[\d,.']+)$/i);
    //matches potentially contains location components:
    //matches[3] = chromosome (optional)
    //matches[4] = start base (optional)
    //matches[6] = end base (or center base, if it's the only one)

    if( !matches )
        return null;

    // parses a number from a locstring that's a coordinate, and
    // converts it from 1-based to interbase coordinates
    var parseCoord = function( coord ) {
        coord = (coord+'').replace(/\D/g,'');
        var num = parseInt( coord, 10 );
        return typeof num == 'number' && !isNaN(num) ? num : null;
    };

    return {
        start: parseCoord( matches[4] )-1,
        end:   parseCoord( matches[6] ),
        ref:   matches[3]
    };
};

Util.assembleLocString = function( loc_in ) {
    var s = '',
        types = { start: 'number', end: 'number', ref: 'string' },
        location = {}
       ;

    // filter the incoming loc_in to only pay attention to slots that we
    // know how to handle
    for( var slot in types ) {
        if( types[slot] == typeof loc_in[slot]
            && (types[slot] != 'number' || !isNaN(loc_in[slot])) //filter any NaNs
          ) {
            location[slot] = loc_in[slot];
        }
    }

    //finally assemble our string
    if( 'ref' in location ) {
        s += location.ref;
        if( location.start || location.end )
            s += ':';
    }
    if( 'start' in location ) {
        s += (Math.round(location.start)+1).toFixed(0).toLocaleString();
        if( 'end' in location )
            s+= '..';
    }
    if( 'end' in location )
        s += Math.round(location.end).toFixed(0).toLocaleString();

    return s;
};

// given a possible reference sequence name and an object as { 'foo':
// <refseq foo>, ... }, try to match that reference sequence name
// against the actual name of one of the reference sequences.  returns
// the reference sequence record, or null
// if none matched.
Util.matchRefSeqName = function( name, refseqs ) {
    for( var ref in refseqs ) {
        if( ! refseqs.hasOwnProperty(ref) )
            continue;

        var ucname = name.toUpperCase();
        var ucref  = ref.toUpperCase();

	if(    ucname == ucref
            || "CHR" + ucname == ucref
            || ucname == "CHR" + ucref
          ) {
            return refseqs[ref];
        }
    }
    return null;
};

/**
 * Wrap a handler function to be called 1ms later in a window timeout.
 * This will usually give a better stack trace for figuring out where
 * errors are happening.
 */
Util.debugHandler = function( context, func ) {
    return function() {
        var args = arguments;
        window.setTimeout( function() {
            var f = func;
            if( typeof f == 'string' )
                f = context[f];
            f.apply(context,args);
        }, 1);
    };
};

Util.ucFirst = function(str) {
    if( typeof str != 'string') return undefined;
    return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Uniqify an array.
 * @param stuff {Array} array of stuff
 * @param normalizer {Function} optional function to be called on each
 * element.  by default, just compares by stringification
 */
Util.uniq = function( stuff, normalizer ) {
    normalizer = normalizer || function(t) {
        return ''+t;
    };
    var result = [],
        seen   = {};
    dojo.forEach( stuff, function(thing) {
        var norm = normalizer(thing);
        if( !seen[ normalizer(thing) ] )
            result.push( thing );
        seen[norm] = true;
    });
    return result;
};

Util.crc32Table = "00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D";

/**
 * Does a (deep) crc32 of any object.
 * @returns {Number}
 */
Util.objectFingerprint = function( obj ) {
    var crc = 0,
          x = 0,
          y = 0;

    var table = Util.crc32Table;
    var crcstr = function( str ) {
        for( var i = 0, iTop = str.length; i < iTop; i++ ) {
            y = ( crc ^ str.charCodeAt( i ) ) & 0xFF;
            x = "0x" + table.substr( y * 9, 8 );
            crc = ( crc >>> 8 ) ^ x;
        }
    };

    if( typeof obj == 'object' ) {
        for( var prop in obj ) {
            crcstr( '' + Util.objectFingerprint( prop      ));
            crcstr( '' + Util.objectFingerprint( obj[prop] ));
        }
    } else {
        crcstr( ''+obj );
    }
    return crc;
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

/**
 * @class
 */
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

Copyright (c) 2007-2010 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
