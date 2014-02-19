/**
 * Dialog for adding a new data hub to the browser.  Very minimal
 * right now, just a text box for a URL.  Eventually, should be
 * expanded to allow searching and browsing for available data hubs.
 */
define([
           'dojo/_base/declare',
           'dojo/dom-construct',

           'dijit/form/TextBox',
           'dijit/form/CheckBox',

           'JBrowse/View/Dialog/Prompt'
       ],
       function(
           declare,
           dom,

           dijitTextBox,
           dijitCheckBox,

           PromptDialog
       ) {
return declare( 'JBrowse/View/DataHubManager/AddHubDialog', PromptDialog, {

title: 'Add data hub',
className: 'addHubDialog',

buildRendering: function() {
    this.inherited(arguments);

    new dijitTextBox({ name: 'url' })
        .placeAt(
            dom.create( 'label', { innerHTML: '<span class="text">URL</span>' }, this.form.domNode )
        );
    new dijitCheckBox({ name: 'switchTo' })
        .placeAt(
            dom.create( 'label', { innerHTML: '<span class="text">Open immediately</span>' }, this.form.domNode )
        );
}

});
});