if(!dojo._hasResource["dojox.crypto.Blowfish"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.crypto.Blowfish"] = true;
dojo.provide("dojox.crypto.Blowfish");
dojo.require("dojox.encoding.crypto.Blowfish");

dojo.deprecated("dojox.crypto.Blowfish", "DojoX cryptography has been merged into DojoX Encoding. To use Blowfish, include dojox.encoding.crypto.Blowfish.", "1.2");

dojox.crypto.Blowfish=dojox.encoding.crypto.Blowfish;

}
