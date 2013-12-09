/**
 * Miscellaneous utility functions.
 */
define( [
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/Deferred',
            'dojo/errors/CancelError',
            
            'JBrowse/Errors',
            'JBrowse/Model/SimpleFeature',

            'dojox/lang/functional/object',
            'dojox/lang/functional/fold'

        ],
        function(
            array,
            lang,
            Deferred,
            DojoCancelError,

            Errors,
            SimpleFeature
        ) {

var Util = {
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

    commifyNumber: function() {
        return this.addCommas.apply( this, arguments );
    },

    /**
     * Returns a Deferred that is already resolved with the given
     * value.
     */
    resolved: function( value ) {
        var d = new Deferred();
        d.resolve( value );
        return d;
    },

    /**
     * Read from a Deferred if it is resolved already, otherwise
     * return undefined.  If the Deferred is rejected, throws the
     * error it contains.
     */
    sync: function( deferred ) {
        if( deferred.isFulfilled() ) {
            var value, gotValue, error, gotError;
            deferred.then(function(v) { gotValue = true; value = v; }, function(e) { gotError = true; error = e; });
            if( gotValue )
                return value;
            else if( gotError )
                throw error;
        }
        return undefined;
    },

    /**
     * Lazily-construct a 
     */
    lazy: function( obj, key, callback, args ) {
        return obj[key] || ( obj[key] = callback.apply( obj, args ) );
    },

    loadJS: function( paths ) {
        var d = new Deferred();
        require( paths, function() {
            var modules = Array.prototype.slice.call( arguments );

            // check the loaded modules for success
            for( var i = 0; i<modules.length; i++ ) {
                if( typeof modules[i] != 'function' ) {
                    d.reject("could not load "+paths[i]+": "+modules[i]);
                    return;
                }
            }

            d.resolve( modules );
        });
        return d;
    },

    logError: function( error ) {
        console.error( error.stack || ''+error );
    },
    logErrorAndThrow: function( error ) {
        console.error( error.stack || ''+error );
        throw error;
    },

    // given an error object, throw it unless it's an instance of a
    // JBrowse cancel error (which is a subclass of the dojo cancel
    // error)
    cancelOK: function( error ) {
        if(!(  error instanceof Errors.Cancel ) ) {
            //Util.logError( error );
            throw error;
        }
    },

    loadJSClass: function( classname ) {
        return Util.loadJS( [ classname ] )
            .then( function( modules ) {
                       return modules[0];
                   });
    },

    /**
     * Load a class and instantiate an object of it with the given
     * params.  Deferred.
     */
    instantiate: function( classname, args ) {
        return Util.loadJSClass( classname )
            .then( function( Class ) {
                       return new Class( args );
             });
    },

    /**
     * Load a class and instantiate a standard JBrowse component that
     * accepts a "config" attribute.
     */
    instantiateComponent: function( args, config, defaultType ) {
        var type = config.type || defaultType;
        if( type.indexOf('/') == -1 )
            type = defaultType+'/'+type;
        return Util.instantiate(
            type,
            lang.mixin({ config: config }, args )
        );
    },

    /**
     * Fast, simple class-maker, used for classes that need speed more
     * than they need dojo.declare's nice features.
     */
    fastDeclare: function( members ) {
        var constructor = members.constructor;
        var fastDeclareClass = function() {
            constructor.apply( this, arguments );
        };
        lang.mixin( fastDeclareClass.prototype, members );
        return fastDeclareClass;
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

    /**
     * Like dojo mixin, except variables are mixed into the target
     * with a leading "_" prepended to their key names.
     */
    privateMixin: function( target ) {
        var sources = Array.prototype.slice.call( arguments, 1 );
        for( var si = 0; si<sources.length; si++ ) {
            var src = sources[si];
            for( var k in src )
                if( src.hasOwnProperty(k) )
                    target['_'+k] = src[k];
        }
        return target;
    },

    /**
     * Given an array of numbers and a single number, find the index
     * of the number in the array that is closest to that number.
     */
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

    // make a timeout that has a remove() method that can be called on
    // it, for compatibility with dijit/Destroyable this.own
    wait: function( duration ) {
        var d = new Deferred( function(r) {
            if( t )
               clearTimeout(t);
        });
        d.then( null,
                function( e ) {
                    if( t ) {
                        clearTimeout(t);
                        t = undefined;
                    }
                });

        var t = setTimeout( d.resolve, duration );
        return d;
    },

    requestAnimationFrame: (function() {
      var raf = window.requestAnimationFrame
                                    || window.webkitRequestAnimationFrame
                                    || window.mozRequestAnimationFrame
                                    || window.oRequestAnimationFrame
                                    || function( callback ){
                                        window.setTimeout( callback, 1000 / 30 );
                                    };
      return lang.hitch( window, raf );
    }.call() ),

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
        return template.replace(/\{([\w\s]+)\}/g,
                                function(match, group) {
                                    var f = fillWith[group];
                                    if (f !== undefined) {
                                        if( typeof f == 'function' )
                                            return f();
                                        else
                                            return f;
                                    } else if( fillWith.callback ) {
                                        var v = fillWith.callback.call( this, group );
                                        if( v !== undefined )
                                            return v;
                                    }
                                    return "{" + group + "}";
                                });
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
        var inputNum = num;
        num = parseFloat(num);
        var neg = num < 0;
        num = Math.abs( num );

        var suffix;
        if( num >= 1e9 ) {
            if( num >= 1e12 ) {
                num /= 1e12;
                suffix = 'T';
            } else {
                num /= 1e9;
                suffix = 'G';
            }
        } else if( num >= 1000 ) {
            if( num >= 1e6 ) {
                num /= 1e6;
                suffix = 'M';
            } else {
                num /= 1000;
                suffix = 'K';
            }
        }

        if( suffix ) {
            var hrNum = ( neg ? '-' : '' )+(num.toString()+' '+suffix).replace(/\.0+ /,' ');
            return hrNum.length < inputNum.toString().length ? hrNum : Util.commifyNumber( inputNum );
        }
        else {
            return inputNum.toString();
        }
    },

    // from http://bugs.dojotoolkit.org/ticket/5794
    resolveUrl: function(baseUrl, relativeUrl) {
        // summary:
        // This takes a base url and a relative url and resolves the target url.
        // For example:
        // resolveUrl("http://www.domain.com/path1/path2","../path3") ->"http://www.domain.com/path1/path3"
        //
        if( typeof relativeUrl != 'string' )
            return relativeUrl;

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
        var inloc = locstring;
        if( typeof locstring != 'string' )
            return null;

        locstring = lang.trim( locstring );

        // any extra stuff in parens?
        var extra = (locstring.match(/\(([^\)]+)\)$/)||[])[1];

        // parses a number from a locstring that's a coordinate, and
        // converts it from 1-based to interbase coordinates
        var parseCoord = function( coord ) {
            coord = (coord+'').replace(/[^\d\-]/g,'');
            var num = parseInt( coord, 10 );
            return typeof num == 'number' && !isNaN(num) ? num : null;
        };

        var location = {};
        var tokens;

        if( locstring.indexOf(':') != -1 ) {
            tokens = locstring.split(':',2);
            location.seq_id = lang.trim( tokens[0] );
            locstring = tokens[1];
        }

        tokens = locstring.match( /^\s*(-?[\d,]+)\s*\.\.+\s*(-?[\d,]+)/ );
        if( tokens ) { // range of two numbers?
            location.start = parseCoord( tokens[1] )-1;
            location.end = parseCoord( tokens[2] );

            // reverse the numbers if necessary
            if( location.start > location.end ) {
                var t = location.start+1;
                location.start = location.end - 1;
                location.end = t;
            }
        }
        else { // one number?
            tokens = locstring.match( /^\s*(-?[\d,]+)\b/ );
            if( tokens ) {
                location.end = location.start = parseCoord( tokens[1] )-1;
            }
            else // got nothin
                return null;
        }

        if( extra )
            location.extra = extra;

        return new SimpleFeature({ data: location });
    },

    basename: function( str, suffixList ) {
        if( ! str || ! str.match )
            return undefined;
        var m = str.match( /[\/\\]([^\/\\]+)[\/\/\/]*$/ );
        var bn = m ? m[1] || undefined : str;
        if( bn && suffixList ) {
            if( !( suffixList instanceof Array ) )
                suffixList = [ suffixList ];
            suffixList = array.map( suffixList, function( s ) {
                return s.replace( /([\.\?\+])/g, '\\$1' );
            });
            bn = bn.replace( new RegExp( suffixList.join('|')+'$', 'i' ), '' );
        }
        return bn;
    },

    assembleLocString: function( loc_in ) {
        if( ! loc_in )
            return null;

        var s = '',
        types = { start: 'number', end: 'number', seq_id: 'string', ref: 'string', strand: 'number' },
        location = {}
        ;

        // filter the incoming loc_in to only pay attention to slots that we
        // know how to handle
        if( typeof loc_in.get == 'function' ) {
            for( var slot in types ) {
                if( types[slot] == typeof loc_in.get(slot)
                    && (types[slot] != 'number' || !isNaN(loc_in.get(slot))) //filter any NaNs
                  ) {
                      location[slot] = loc_in.get(slot);
                  }
            }
        } else {
            for( var slot in types ) {
                if( types[slot] == typeof loc_in[slot]
                    && (types[slot] != 'number' || !isNaN(loc_in[slot])) //filter any NaNs
                  ) {
                      location[slot] = loc_in[slot];
                  }
            }
        }

        //finally assemble our string
        if( 'seq_id' in location ) {
            s += location.seq_id;
            if( location.start || location.end )
                s += ':';
        }
        else if( 'ref' in location ) {
            s += location.ref;
            if( location.start || location.end )
                s += ':';
        }

        if( 'start' in location ) {
            s += Util.addCommas( (Math.round(location.start)+1).toFixed(0).toLocaleString() );
            if( 'end' in location )
                s+= '..';
        }
        if( 'end' in location )
            s += Util.addCommas( Math.round(location.end).toFixed(0).toLocaleString() );

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
        array.forEach( stuff, function(thing) {
                          var norm = normalizer(thing);
                          if( !seen[ normalizer(thing) ] )
                              result.push( thing );
                          seen[norm] = true;
                      });
        return result;
    },

    // given a specification like { browser: 'object', foo: true },
    // validate the given args against it.  if any of the tests fail,
    // throws an Error.
    validate: function( object, spec ) {
        var errors = [];
        for( var name in spec ) {
            var test = spec[name];
            var testType = typeof test;
            if( testType == 'string' ) {
                if( test == 'any' ) {
                    if( ! ( name in object ) )
                        errors.push( name+' attribute missing' );
                }
                else if( test == 'integer' ) {
                    if( !(name in object) || Math.floor( object[name] ) !== object[name] )
                        errors.push( name + ' ' + 'must be an integer' );
                }
                else {
                    if( typeof object[name] !== test )
                        errors.push( name + ' ' + test + ' must be provided' );
                }
            }
            else if( testType == 'function' ) {
                var errormessage;
                if(( errormessage = test( object[name] )))
                    errors.push( errormessage );
            }
        }

        if( errors.length )
            throw new Error( errors.join('; ') );
    },

    // back-compatible way to remove properties/attributes from DOM
    // nodes.  IE 7 and older do not support the `delete` operator on
    // DOM nodes.
    removeAttribute: function( domNode, attrName ) {
        try { delete domNode[attrName]; }
        catch(e) {
            if( domNode.removeAttribute )
                domNode.removeAttribute( attrName );
        }
    },

    // utility method that calculates standard deviation from sum and sum of squares
    calcStdDevFromSums: function( sum, sumSquares, n ) {
        if( n == 0 )
            return 0;

        var variance = sumSquares - sum*sum/n;
        if (n > 1) {
	    variance /= n-1;
        }
        return variance < 0 ? 0 : Math.sqrt(variance);
    }
};

    return Util;
});

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
