define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/aspect",
    "dijit/focus",
    "dijit/form/Button",
    "dijit/form/RadioButton",
    "dijit/form/CheckBox",
    "dijit/form/TextBox",
    "JBrowse/View/Dialog/WithActionBar",
], function (
    declare,
    dom,
    aspect,
    focus,
    dButton,
    dRButton,
    dCheckBox,
    dTextBox,
    ActionBarDialog
) {
    return declare(ActionBarDialog, {
        constructor: function () {
            var thisB = this;
            aspect.after(this, "hide", function () {
                focus.curNode && focus.curNode.blur();
                setTimeout(function () {
                    thisB.destroyRecursive();
                }, 500);
            });
        },

        _dialogContent: function () {
            var content = (this.content = {});

            var container = dom.create("div", { className: "search-dialog" });

            var introdiv = dom.create(
                "div",
                {
                    className: "search-dialog intro",
                    innerHTML:
                        "This tool creates tracks showing regions of the reference sequence (or its translations) that match a given DNA or amino acid sequence.",
                },
                container
            );

            // Render text box
            var searchBoxDiv = dom.create(
                "div",
                {
                    className: "section",
                },
                container
            );
            dom.create(
                "span",
                {
                    className: "header",
                    innerHTML: "Search for",
                },
                searchBoxDiv
            );

            var trackLabelDiv = dom.create(
                "div",
                {
                    className: "section",
                },
                container
            );
            dom.create(
                "span",
                {
                    className: "header",
                    innerHTML: "Track label (optional)",
                },
                trackLabelDiv
            );
            var translateDiv = dom.create(
                "div",
                {
                    className: "translateContainer",
                },
                searchBoxDiv
            );
            function makeRadio(args, parent) {
                var label = dom.create("label", {}, parent);
                var radio = new dRButton(args).placeAt(label);
                dom.create("span", { innerHTML: args.label }, label);
                return radio;
            }
            makeRadio(
                { name: "translate", value: "no", label: "DNA", checked: true },
                translateDiv
            );
            content.translate = makeRadio(
                { name: "translate", value: "yes", label: "AA" },
                translateDiv
            );

            content.searchBox = new dTextBox({}).placeAt(searchBoxDiv);

            content.trackLabelBox = new dTextBox({}).placeAt(trackLabelDiv);

            // Render 'ignore case' checkbox
            var textOptionsDiv = dom.create(
                "div",
                {
                    className: "section",
                },
                container
            );

            var caseDiv = dom.create(
                "div",
                {
                    className: "checkboxdiv",
                },
                textOptionsDiv
            );
            content.caseIgnore = new dCheckBox({
                label: "Ignore case",
                id: "search_ignore_case",
                checked: true,
            });
            caseDiv.appendChild(content.caseIgnore.domNode);
            dom.create(
                "label",
                { for: "search_ignore_case", innerHTML: "Ignore Case" },
                caseDiv
            );

            // Render 'treat as regex' checkbox
            var regexDiv = dom.create(
                "div",
                {
                    className: "checkboxdiv",
                },
                textOptionsDiv
            );
            content.regex = new dCheckBox({
                label: "Treat as regular expression",
                id: "search_as_regex",
            }).placeAt(regexDiv);
            dom.create(
                "label",
                {
                    for: "search_as_regex",
                    innerHTML: "Treat as regular expression",
                },
                regexDiv
            );

            // Render 'forward strand' and 'reverse strand' checkboxes
            var strandsDiv = dom.create(
                "div",
                {
                    className: "section",
                },
                container
            );
            dom.create(
                "span",
                {
                    className: "header",
                    innerHTML: "Search strands",
                },
                strandsDiv
            );

            var fwdDiv = dom.create("div", {
                className: "checkboxdiv",
            });
            content.fwdStrand = new dCheckBox({
                id: "search_fwdstrand",
                checked: true,
            });
            var revDiv = dom.create("div", {
                className: "checkboxdiv",
            });
            content.revStrand = new dCheckBox({
                id: "search_revstrand",
                checked: true,
            });
            fwdDiv.appendChild(content.fwdStrand.domNode);
            dom.create(
                "label",
                { for: "search_fwdstrand", innerHTML: "Forward" },
                fwdDiv
            );
            revDiv.appendChild(content.revStrand.domNode);
            dom.create(
                "label",
                { for: "search_revstrand", innerHTML: "Reverse" },
                revDiv
            );
            strandsDiv.appendChild(fwdDiv);
            strandsDiv.appendChild(revDiv);

            return container;
        },

        _getSearchParams: function () {
            var content = this.content;
            return {
                expr: content.searchBox.get("value"),
                trackLabel: content.trackLabelBox.get("value"),
                regex: content.regex.checked,
                caseIgnore: content.caseIgnore.checked,
                translate: content.translate.checked,
                fwdStrand: content.fwdStrand.checked,
                revStrand: content.revStrand.checked,
                maxLen: 100,
            };
        },

        _fillActionBar: function (actionBar) {
            var thisB = this;

            new dButton({
                label: "Search",
                iconClass: "dijitIconBookmark",
                onClick: function () {
                    var searchParams = thisB._getSearchParams();
                    thisB.callback(searchParams);
                    thisB.hide();
                },
            }).placeAt(actionBar);
            new dButton({
                label: "Cancel",
                iconClass: "dijitIconDelete",
                onClick: function () {
                    thisB.callback(false);
                    thisB.hide();
                },
            }).placeAt(actionBar);
        },

        show: function (callback) {
            this.callback = callback || function () {};
            this.set("title", "Add sequence search track");
            this.set("content", this._dialogContent());
            this.inherited(arguments);
            focus.focus(this.closeButtonNode);
        },
    });
});
