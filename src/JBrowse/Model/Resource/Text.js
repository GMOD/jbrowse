define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           '../Resource'
       ],
       function(
           declare,
           lang,
           Resource
       ) {
return declare( Resource, {
    _defaultFetchOpts: function() {
        return lang.mixin(
            this.inherited(arguments),
            {
                handleAs: 'text'
            });
    }
});
});