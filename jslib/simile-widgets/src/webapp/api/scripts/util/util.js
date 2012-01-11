/*==================================================
 *  Exhibit Utility Functions
 *==================================================
 */
Exhibit.Util = {};

/**
 * Round a number n to the nearest multiple of precision (any positive value),
 * such as 5000, 0.1 (one decimal), 1e-12 (twelve decimals), or 1024 (if you'd
 * want "to the nearest kilobyte" -- so round(66000, 1024) == "65536"). You are
 * also guaranteed to get the precision you ask for, so round(0, 0.1) == "0.0".
 */
Exhibit.Util.round = function(n, precision) {
    precision = precision || 1;
    var lg = Math.floor( Math.log(precision) / Math.log(10) );
    n = (Math.round(n / precision) * precision).toString();
    var d = n.split(".");
    if (lg >= 0) {
        return d[0];
    }

    lg = -lg;
    d[1] = (d[1]||"").substring(0, lg);
    while (d[1].length < lg) {
        d[1] += "0";
    }
    return d.join(".");  
}


//=============================================================================
// Javascript 1.6 Array extensions
// from Mozilla's compatibility implementations
//=============================================================================


if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(elt /*, from*/)
  {
    var len = this.length;

    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++)
    {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
  };
}


if (!Array.prototype.filter)
{
  Array.prototype.filter = function(fun /*, thisp*/)
  {
    var len = this.length;
    if (typeof fun != "function")
      throw new TypeError();

    var res = new Array();
    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in this)
      {
        var val = this[i]; // in case fun mutates this
        if (fun.call(thisp, val, i, this))
          res.push(val);
      }
    }

    return res;
  };
}


if (!Array.prototype.map) {
    Array.prototype.map = function(f, thisp) {
        if (typeof f != "function")
            throw new TypeError();
        if (typeof thisp == "undefined") {
            thisp = this;
        }
        var res = [], length = this.length;
        for (var i = 0; i < length; i++) {
            if (this.hasOwnProperty(i))
                res[i] = f.call(thisp, this[i], i, this);
        }
        return res;
    };
}


if (!Array.prototype.forEach)
{
  Array.prototype.forEach = function(fun /*, thisp*/)
  {
    var len = this.length;
    if (typeof fun != "function")
      throw new TypeError();

    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in this)
        fun.call(thisp, this[i], i, this);
    }
  };
}
