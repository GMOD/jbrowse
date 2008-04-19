if(!dojo._hasResource["dojox.analytics"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.analytics"] = true;
dojo.provide("dojox.analytics");
dojo.require("dojox.analytics._base");
dojo.require("dojo._base.connect");
dojo.require("dojo._base.Deferred");
dojo.require("dojo._base.json");
dojo.require("dojo._base.array");
dojo.requireIf(dojo.isBrowser, "dojo._base.window");
dojo.requireIf(dojo.isBrowser, "dojo._base.event");
dojo.requireIf(dojo.isBrowser, "dojo._base.html");
dojo.requireIf(dojo.isBrowser, "dojo._base.NodeList");
dojo.requireIf(dojo.isBrowser, "dojo._base.query");
dojo.requireIf(dojo.isBrowser, "dojo._base.xhr");

}
