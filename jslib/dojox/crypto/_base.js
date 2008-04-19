if(!dojo._hasResource["dojox.crypto._base"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.crypto._base"] = true;
dojo.provide("dojox.crypto._base");

dojo.require("dojox.encoding.crypto._base");
dojo.require("dojox.encoding.digests._base");

dojo.deprecated("dojox.crypto._base", "DojoX cryptography has been merged into DojoX Encoding. To use, include dojox.encoding.digests and/or dojox.encoding.crypto.", "1.2");

//	unfortunately there's no way of pointing at two files with an alias, particularly 
//	when both have similarly named things; but we'll try anyways.
dojox.crypto._base=dojo.mixin(dojox.encoding.crypto._base, dojox.encoding.digests._base);

}
