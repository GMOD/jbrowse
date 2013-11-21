define([
           'dojo/_base/declare'
       ],
       function(
           declare
       ) {

return declare( null, {
constructor: function(args) {
    this._self = args.self;
    this._self.postMessage('ready');
}



});
});