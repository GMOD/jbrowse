define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom',
           'dojo/Deferred',
           'JBrowse/View/Dialog/WithActionBar',
           'dijit/form/Button'
       ],
       function(
           declare,
           lang,
           array,
           dom,
           Deferred,
           ActionBarDialog,
           dijitButton
       ) {

return declare( ActionBarDialog, {

    refocus: false,
    autofocus: false,

    _fillActionBar: function( actionBar ) {
        var thisB = this;
        thisB.form.onSubmit = function() {
            thisB.submit();
            return false;
        };
            new dijitButton({
                className: 'Submit',
                label: 'Submit',
                onClick: function() {
                    thisB.submit();
                },
                focus: false
            })
            .placeAt( actionBar);

            new dijitButton({
                className: 'Cancel',
                label: 'Cancel',
                onClick: dojo.hitch(this,'hide'),
                focus: false
            })
            .placeAt( actionBar);
    },

    submit: function() {
        this.deferredResults.resolve( this.form.getValues() );
        this.hide();
    },

    prompt: function() {
        this.show();
        return this.deferredResults = new Deferred();
    },

    hide: function() {
        this.inherited(arguments);
        window.setTimeout( lang.hitch( this, 'destroyRecursive' ), 1000 );
    }
});
});