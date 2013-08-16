define([
        'dojo/_base/declare',
        'dojo/dom-construct',
        'dojo/aspect',
        'dijit/focus',
        'dijit/form/Button',
        'dijit/form/CheckBox',
        'dijit/form/Textarea',
        'JBrowse/View/Dialog/WithActionBar'
    ],
    function(
        declare,
        dom,
        aspect,
        focus,
        dButton,
        dCheckBox,
        dTextArea,
        ActionBarDialog
    ) {

return declare( ActionBarDialog, {

    constructor: function() {
        var thisB = this;
        aspect.after( this, 'hide', function() {
              focus.curNode && focus.curNode.blur();
              setTimeout( function() { thisB.destroyRecursive(); }, 500 );
        });
    },

    _dialogContent: function () {
        var content = {};

        // Render text box
        content.searchBox = new dTextArea();


        // Render 'ignore case' checkbox
        content.textOptionsDiv = dom.create('div', {});
        content.caseIgnore = new dCheckBox({
                                                label: "Ignore case",
                                                id: "search_ignore_case"
                                            });
        content.textOptionsDiv.appendChild( content.caseIgnore.domNode );
        dom.create( "label", { "for": "search_ignore_case", innerHTML: "Ignore Case"}, content.textOptionsDiv );
        // Render 'treat as regex' checkbox
        dom.create( "br", {}, content.textOptionsDiv );
        content.regex = new dCheckBox({
                                        label: "Treat as regular expression",
                                        id: "search_as_regex"
                                    });
        content.textOptionsDiv.appendChild( content.regex.domNode );
        dom.create( "label", { "for": "search_as_regex", innerHTML: "Treat as regular expression" }, content.textOptionsDiv );
        

        // Checkbox that toggles amino acid search
        content.translateDiv = dom.create( 'div', {});
        content.translate = new dCheckBox({
                                                label: "Translate Sequence",
                                                id: "search_translate_first"
                                            });
        content.translateDiv.appendChild( content.translate.domNode );
        dom.create( "label", { "for": "search_translate_first", innerHTML: "Translate Sequence" }, content.translateDiv );

        // Render 'forward strand' and 'reverse strand' checkboxes
        content.strandsDiv = dom.create( 'div', {} );
        dom.create( "span", { innerHTML: "Strands to search" }, content.strandsDiv );
        dom.create( "br", {}, content.strandsDiv );
        content.fwdStrand = new dCheckBox({
                                                label: "Forward Strand",
                                                id: "search_fwdstrand",
                                                checked: true
                                            });
        content.revStrand = new dCheckBox({
                                                label: "Reverse Strand",
                                                id: "search_revstrand",
                                                checked: true
                                            });
        content.strandsDiv.appendChild( content.fwdStrand.domNode );
        dom.create( "label", { "for": "search_fwdstrand", innerHTML: "Forward Strand"}, content.strandsDiv );
        dom.create( "br", {}, content.strandsDiv );
        content.strandsDiv.appendChild( content.revStrand.domNode );
        dom.create( "label", { "for": "search_revstrand", innerHTML: "Reverse Strand"}, content.strandsDiv );


        this.content = content;

        return [ content.searchBox.domNode, content.textOptionsDiv, content.translateDiv, content.strandsDiv ];
    },

    _getSearchParams: function() {
        var content = this.content;
        return {
            expr: content.searchBox.get('value'),
            regex: content.regex.checked,
            caseIgnore: content.caseIgnore.checked,
            translate: content.translate.checked,
            fwdStrand: content.fwdStrand.checked,
            revStrand: content.revStrand.checked,
            maxLen: 100
        };
    },

    _fillActionBar: function ( actionBar ) {
        var thisB = this;

        new dButton({
                            className: 'yes',
                            label: 'Search',
                            onClick: function() {
                                var searchParams = thisB._getSearchParams();
                                thisB.callback( searchParams );
                                thisB.hide();
                            }
                        })
            .placeAt( actionBar );
        new dButton({
                            className: 'no',
                            label: 'Cancel',
                            onClick: function() {
                                thisB.callback( false );
                                thisB.hide();
                            }
                        })
            .placeAt( actionBar );
    },

    show: function ( callback ) {
        this.callback = callback || function() {};
        this.set( 'title', "Add Sequence Search Track");
        this.set( 'content', this._dialogContent() );
        this.inherited( arguments );
        focus.focus( this.closeButtonNode );
    }

});
});