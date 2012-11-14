// MISC
define( [ 'dojox/lang/functional/object',
          'dojox/lang/functional/fold'
        ], function() {
var Util;
Util = {
    dojof: dojox.lang.functional,
    is_ie: navigator.appVersion.indexOf('MSIE') >= 0,
    is_ie6: navigator.appVersion.indexOf('MSIE 6') >= 0,
    addCommas: function(nStr) {
	        nStr += '';
	        var x = nStr.split('.');
	        var x1 = x[0];
	        var x2 = x.length > 1 ? '.' + x[1] : '';
	        var rgx = /(\d+)(\d{3})/;
	        while (rgx.test(x1)) {
		    x1 = x1.replace(rgx, '$1' + ',' + '$2');
	        }
	return x1 + x2;
    },


    /**
     * Fast, simple class-maker, used for classes that need speed more
     * than they need dojo.declare's nice features.
     */
    fastDeclare: function( members, className ) {
        var constructor = members.constructor;
        var fastDeclareClass = function() {
            constructor.apply( this, arguments );
        };
        dojo.mixin( fastDeclareClass.prototype, members );
        return fastDeclareClass;
    },

    wheel: function(event) {
        var delta = 0;
        if (!event) event = window.event;
        if (event.wheelDelta) {
            delta = event.wheelDelta/120;
            if (window.opera) delta = -delta;
        } else if (event.detail) { delta = -event.detail/3;	}
        return Math.round(delta); //Safari Round
    },

    isRightButton: function(e) {
        if (!e)
            var e = window.event;
        if (e.which)
            return e.which == 3;
        else if (e.button)
            return e.button == 2;
        else
            return false;
    },

    getViewportWidth: function() {
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
    },

    getViewportHeight: function() {
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
    },

    findNearest: function(numArray, num) {
        var minIndex = 0;
        var min = Math.abs(num - numArray[0]);
        for (var i = 1; i < numArray.length; i++) {
            if (Math.abs(num - numArray[i]) < min) {
                minIndex = i;
                min = Math.abs(num - numArray[i]);
            }
        }
        return minIndex;
    },

    /**
     * replace variables in a template string with values
     * @param template String with variable names in curly brackets
     *                 e.g., "http://foo/{bar}?arg={baz}
     * @param fillWith object with attribute-value mappings
     *                 e.g., {'bar': 'someurl', 'baz': 'valueforbaz'}
     * @returns the template string with variables in fillWith replaced
     *                 e.g., 'htp://foo/someurl?arg=valueforbaz'
     */
    fillTemplate: function(template, fillWith) {
        return template.replace(/\{([^}]+)\}/g,
                                function(match, group) {
                                    var f = fillWith[group];
                                    if (f !== undefined) {
                                        if( typeof f == 'function' )
                                            return f();
                                        else
                                            return f;
                                    } else {
                                        return "{" + group + "}";
                                    }
                                });
    },

    /**
     * function to load a specified resource only once
     * @param {Object}   dojoXhrArgs object containing arguments for dojo.xhrGet,
     *                               like <code>url</code> and <code>handleAs</code>
     * @param {Object}   stateObj object that stores the state of the load
     * @param {Function} successCallback function to call on a successful load
     * @param {Function} errorCallback function to call on an unsuccessful load
     */
    maybeLoad: function ( dojoXhrArgs, stateObj, successCallback, errorCallback) {
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
    },

    /**
     * updates a with values from b, recursively
     */
    deepUpdate: function(a, b) {
        for (var prop in b) {
            if ((prop in a)
                && ("object" == typeof b[prop])
                && ("object" == typeof a[prop]) ) {
                Util.deepUpdate(a[prop], b[prop]);
            } else if( typeof a[prop] == 'undefined' || typeof b[prop] != 'undefined' ){
                a[prop] = b[prop];
            }
        }
        return a;
    },

    humanReadableNumber: function( num ) {
        num = parseInt(num);
        var suffix = '';
        if( num >= 1e12 ) {
            num /= 1e12;
            suffix = 'T';
        } else if( num >= 1e9 ) {
            num /= 1e9;
            suffix = 'G';
        } else if( num >= 1e6 ) {
            num /= 1e6;
            suffix = 'M';
        } else if( num >= 1000 ) {
            num /= 1000;
            suffix = 'K';
        }

        return (num.toFixed(2)+' '+suffix).replace(/0+ /,' ').replace(/\. /,' ');
    },

    // from http://bugs.dojotoolkit.org/ticket/5794
    resolveUrl: function(baseUrl, relativeUrl) {
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
        // remove the query string from the base, if any
        baseUrl = baseUrl.replace(/\?.*$/,'');
        //TODO: handle protocol relative urls:  ://www.domain.com
        baseUrl = baseUrl.substring(0,baseUrl.length - baseUrl.match(/[^\/]*$/)[0].length);// clean off the trailing path
        if (relativeUrl == '.')
	    return baseUrl;
        while (baseUrl && relativeUrl.substring(0,3) == '../') {
	    baseUrl = baseUrl.substring(0,baseUrl.length - baseUrl.match(/[^\/]*\/$/)[0].length);
	    relativeUrl = relativeUrl.substring(3);
        }
        return baseUrl + relativeUrl;
    },

    parseLocString: function( locstring ) {
        locstring = dojo.trim( locstring );

        //                                (chromosome)    (    start      )   (  sep     )     (    end   )
        var matches = locstring.match(/^(((\S*)\s*:)?\s*(-?[\d,.']+)\s*(\.\.|-|\s+))?\s*(-?[\d,.']+)(.*)/i);
        //matches potentially contains location components:
        //matches[3] = chromosome (optional)
        //matches[4] = start base (optional)
        //matches[6] = end base (or center base, if it's the only one)
        //matches[7] = any extra stuff at the end

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
            ref:   matches[3],
            extra: matches[7]
        };
    },

    assembleLocString: function( loc_in ) {
        var s = '',
        types = { start: 'number', end: 'number', ref: 'string', strand: 'number' },
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

        if( 'strand' in location )
            s += ({'1':' (+ strand)', '-1': ' (- strand)', '0': ' (no strand)' }[ location.strand || '' ]) || '';

        // add on any extra stuff if it was passed in
        if( 'extra' in loc_in )
            s += loc_in.extra;

        return s;
    },

    /**
     * Complement a sequence (without reversing).
     * @param {String} seqString sequence
     * @returns {String} complemented sequence
     */
    complement:  (function() {
        var compl_rx   = /[ACGT]/gi;

        // from bioperl: tr/acgtrymkswhbvdnxACGTRYMKSWHBVDNX/tgcayrkmswdvbhnxTGCAYRKMSWDVBHNX/
        // generated with:
        // perl -MJSON -E '@l = split "","acgtrymkswhbvdnxACGTRYMKSWHBVDNX"; print to_json({ map { my $in = $_; tr/acgtrymkswhbvdnxACGTRYMKSWHBVDNX/tgcayrkmswdvbhnxTGCAYRKMSWDVBHNX/; $in => $_ } @l})'
        var compl_tbl  = {"S":"S","w":"w","T":"A","r":"y","a":"t","N":"N","K":"M","x":"x","d":"h","Y":"R","V":"B","y":"r","M":"K","h":"d","k":"m","C":"G","g":"c","t":"a","A":"T","n":"n","W":"W","X":"X","m":"k","v":"b","B":"V","s":"s","H":"D","c":"g","D":"H","b":"v","R":"Y","G":"C"};

        var nbsp = String.fromCharCode(160);
        var compl_func = function(m) { return compl_tbl[m] || nbsp; };
        return function( seqString ) {
            return seqString.replace( compl_rx, compl_func );
        };
    })(),

    /**
     * Reverse-complement a sequence string.
     * @param {String} seqString
     * @returns {String} reverse-complemented sequence
     */
    revcom: function( seqString ) {
        return Util.complement( seqString ).split('').reverse().join('');
    },

    assembleLocStringWithLength: function( def ) {
        var locString = Util.assembleLocString( def );
        var length = def.length || def.end-def.start+1;
        return locString + ' ('+Util.humanReadableNumber( length )+'b)';
    },

    // given a possible reference sequence name and an object as { 'foo':
    // <refseq foo>, ... }, try to match that reference sequence name
    // against the actual name of one of the reference sequences.  returns
    // the reference sequence record, or null
    // if none matched.
    matchRefSeqName: function( name, refseqs ) {
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
    },

    /**
     * Wrap a handler function to be called 1ms later in a window timeout.
     * This will usually give a better stack trace for figuring out where
     * errors are happening.
     */
    debugHandler: function( context, func ) {
        return function() {
            var args = arguments;
            window.setTimeout( function() {
                                   var f = func;
                                   if( typeof f == 'string' )
                                       f = context[f];
                                   f.apply(context,args);
                               }, 1);
        };
    },

    ucFirst: function(str) {
        if( typeof str != 'string') return undefined;
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Uniqify an array.
     * @param stuff {Array} array of stuff
     * @param normalizer {Function} optional function to be called on each
     * element.  by default, just compares by stringification
     */
    uniq: function( stuff, normalizer ) {
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
    }
};

    return Util;
});

if (!Array.prototype.reduce) {
  Array.prototype.reduce = function(fun /*, initial*/) {
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

if (!Array.prototype.map) {
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

if (!Array.prototype.indexOf) {
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



/*

Copyright (c) 2007-2010 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
