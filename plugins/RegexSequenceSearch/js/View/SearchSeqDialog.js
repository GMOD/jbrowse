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
        var content = this.content = {};

        var introdiv = dom.create('div', {
            className: 'search-dialog intro',
            innerHTML: 'This tool creates tracks showing regions of the reference sequence (or its translations) that match a given DNA or amino acid sequence.'
        });

        // Render text box
        var searchBoxDiv = dom.create('div', {
            className: "search-dialog section"
        });
        searchBoxDiv.appendChild(
            dom.create( 'span', {
                className: "search-dialog header",
                innerHTML: "Search for"
            })
        );
        content.searchBox = new dTextArea();
        searchBoxDiv.appendChild( content.searchBox.domNode );


        // Render 'ignore case' checkbox
        var textOptionsDiv = dom.create('div', {
            className: "search-dialog section"
        });

        var caseDiv = dom.create("div", {
            className: "search-dialog checkboxdiv"
        });
        content.caseIgnore = new dCheckBox({ label: "Ignore case",
                                               id: "search_ignore_case",
                                               checked: true
                                            });
        caseDiv.appendChild( content.caseIgnore.domNode );
        dom.create( "label", { "for": "search_ignore_case", innerHTML: "Ignore Case"}, caseDiv );
        textOptionsDiv.appendChild( caseDiv );


        var translateDiv = dom.create("div", {
            className: "search-dialog checkboxdiv"
        });
        // Checkbox that toggles amino acid search
        content.translate = new dCheckBox({
                                                label: "Translate sequence before searching",
                                                id: "search_translate_first"
                                            });
        translateDiv.appendChild( content.translate.domNode );
        dom.create( "label", { "for": "search_translate_first", innerHTML: "Translate sequence before searching" }, translateDiv );
        textOptionsDiv.appendChild( translateDiv );


        // Render 'treat as regex' checkbox

        var regexDiv = dom.create("div", {
            className: "search-dialog checkboxdiv"
        });
        content.regex = new dCheckBox({
                                        label: "Treat as regular expression",
                                        id: "search_as_regex"
                                    });
        regexDiv.appendChild( content.regex.domNode );
        dom.create( "label", { "for": "search_as_regex", innerHTML: "Treat as regular expression" }, regexDiv );
        textOptionsDiv.appendChild( regexDiv );

        // Render 'forward strand' and 'reverse strand' checkboxes
        var strandsDiv = dom.create( 'div', {
            className: "search-dialog section"
        } );
        dom.create( "span", {
            className: "search-dialog header",
            innerHTML: "Search strands"
        }, strandsDiv );

        var fwdDiv = dom.create("div", {
            className: "search-dialog checkboxdiv"
        });
        content.fwdStrand = new dCheckBox({
                                                id: "search_fwdstrand",
                                                checked: true
                                            });
        var revDiv = dom.create("div", {
            className: "search-dialog checkboxdiv"
        });
        content.revStrand = new dCheckBox({
                                                id: "search_revstrand",
                                                checked: true
                                            });
        fwdDiv.appendChild( content.fwdStrand.domNode );
        dom.create( "label", { "for": "search_fwdstrand", innerHTML: "Forward"}, fwdDiv );
        revDiv.appendChild( content.revStrand.domNode );
        dom.create( "label", { "for": "search_revstrand", innerHTML: "Reverse"}, revDiv );
        strandsDiv.appendChild( fwdDiv );
        strandsDiv.appendChild( revDiv );

        return [ introdiv, searchBoxDiv, textOptionsDiv, strandsDiv ];
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
        this.set( 'title', "Add sequence search track");
        this.set( 'content', this._dialogContent() );
        this.inherited( arguments );
        focus.focus( this.closeButtonNode );
    }

});
});